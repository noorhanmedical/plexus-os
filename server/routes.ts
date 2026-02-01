import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import * as localData from "./localData";
import { analyzePatientForAncillaries, generateEvidenceSummary } from "./aiAnalysis";
import { ANCILLARY_CATALOG, getAncillaryByCode } from "../shared/ancillaryCatalog";
import { dbHealthCheck } from "./db";


// ✅ ADD THESE IMPORTS
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Client } from "pg";
import { parse } from "csv-parse/sync";

const PLEXUS_API_URL =
  "https://script.google.com/macros/s/AKfycbxUnc6u-UqiYLUraXAwU9nJDk7CzVr_xwZC3rU6_VMj5gU5LVWw7a6S0CVYn5Qx_vFy/exec";
const PLEXUS_API_KEY = process.env.PLEXUS_API_KEY || "";

// Plexus API helper
// Note: Google Apps Script redirects strip custom headers, so we pass api_key in URL params only
async function plexusGet(action: string, params: Record<string, string> = {}): Promise<any> {
  const searchParams = new URLSearchParams({
    action,
    api_key: PLEXUS_API_KEY,
    ...params,
  });

  const response = await fetch(`${PLEXUS_API_URL}?${searchParams.toString()}`, {
    method: "GET",
    redirect: "follow",
  });

  return response.json();
}

// Direct API search - no preloading, instant startup
async function searchPatientsAPI(query: string, limit: number): Promise<any[]> {
  try {
    const data = await plexusGet("patients.search", { q: query, limit: String(limit) });
    if (data.ok && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (error) {
    console.error("[api] Patient search failed:", error);
  }
  return [];
}

// Robust in-memory cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds - balance between freshness and speed

function getCached(key: string): any | null {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[cache] HIT: ${key}`);
    return cached.data;
  }
  if (cached) {
    apiCache.delete(key);
  }
  return null;
}

function setCache(key: string, data: any): void {
  apiCache.set(key, { data, timestamp: Date.now() });
  // Clean up old entries periodically
  if (apiCache.size > 200) {
    const now = Date.now();
    const entries = Array.from(apiCache.entries());
    for (const [k, v] of entries) {
      if (now - v.timestamp > CACHE_TTL) {
        apiCache.delete(k);
      }
    }
  }
}

// Cached version of plexusGet
async function cachedPlexusGet(action: string, params: Record<string, string> = {}): Promise<any> {
  const cacheKey = `GET:${action}:${JSON.stringify(params)}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await plexusGet(action, params);
  if (data.ok) {
    setCache(cacheKey, data);
  }
  return data;
}

// Validation schemas
const searchPatientsSchema = z.object({
  query: z.string().optional().default(""),
  limit: z.string().optional().default("20"),
});

const getPatientSchema = z.object({
  patient_uuid: z.string().min(1, "patient_uuid is required"),
});

const listPrescreensSchema = z.object({
  status: z.string().optional(),
  limit: z.string().optional().default("200"),
});

const getPrescreenSchema = z.object({
  prescreen_id: z.string().optional(),
  patient_uuid: z.string().optional(),
  requested_ancillary_code: z.string().optional(),
});

const createPrescreenSchema = z.object({
  patient_uuid: z.string().min(1, "patient_uuid is required"),
  requested_ancillary_code: z.string().min(1, "requested_ancillary_code is required"),
});

const updatePrescreenSchema = z.object({
  prescreen_id: z.string().min(1, "prescreen_id is required"),
  updates: z.object({
    scheduled_datetime: z.string().optional(),
    assigned_staff: z.string().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const updateStatusSchema = z.object({
  prescreen_id: z.string().min(1, "prescreen_id is required"),
  status: z.string().min(1, "status is required"),
});

const ancillaryUpdateSchema = z.object({
  patient_uuid: z.string().min(1, "patient_uuid is required"),
  ancillary_code: z.string().min(1, "ancillary_code is required"),
  status: z.string().optional(),
  scheduled_date: z.string().optional(),
  notes: z.string().optional(),
  completed_date: z.string().optional(),
});

// Note: Google Apps Script redirects strip custom headers, so we pass api_key in URL params only
async function plexusPost(action: string, payload: Record<string, any> = {}): Promise<any> {
  const response = await fetch(`${PLEXUS_API_URL}?api_key=${PLEXUS_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
    redirect: "follow",
  });

  return response.json();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", async (_req, res) => {
    try {
      const data = await cachedPlexusGet("health");
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to connect to Plexus API" });
    }
  });

  // AWS DATABASE HEALTH CHECK
  app.get("/api/db-health", async (_req, res) => {
    try {
      const ok = await dbHealthCheck();
      res.json({ ok });
    } catch (err: any) {
      console.error("DB HEALTH FAILED:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });


  // Search patients - direct API call, no blocking preload
  app.get("/api/patients/search", async (req, res) => {
    try {
      const validation = searchPatientsSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { query, limit } = validation.data;
      const limitNum = parseInt(limit, 10) || 20;

      // Direct API search - Plexus handles the search server-side
      const results = await searchPatientsAPI(query, limitNum);

      res.json({ ok: true, data: results });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to search patients" });
    }
  });

  // Get patient details
  app.get("/api/patients/:patient_uuid", async (req, res) => {
    try {
      const validation = getPatientSchema.safeParse(req.params);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { patient_uuid } = validation.data;
      const data = await cachedPlexusGet("patients.get", { patient_uuid });
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get patient details" });
    }
  });

  // List prescreens
  app.get("/api/prescreens", async (req, res) => {
    try {
      const validation = listPrescreensSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { status, limit } = validation.data;
      const params: Record<string, string> = { limit };
      if (status) params.status = status;

      const data = await cachedPlexusGet("prescreen.list", params);
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to list prescreens" });
    }
  });

  // Get prescreen details
  app.post("/api/prescreens/get", async (req, res) => {
    try {
      const validation = getPrescreenSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { prescreen_id, patient_uuid, requested_ancillary_code } = validation.data;

      const payload: Record<string, string> = {};
      if (prescreen_id) payload.prescreen_id = prescreen_id;
      if (patient_uuid) payload.patient_uuid = patient_uuid;
      if (requested_ancillary_code) payload.requested_ancillary_code = requested_ancillary_code;

      const data = await plexusPost("prescreen.get", payload);
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get prescreen details" });
    }
  });

  // Create prescreen
  app.post("/api/prescreens", async (req, res) => {
    try {
      const validation = createPrescreenSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { patient_uuid, requested_ancillary_code } = validation.data;

      const data = await plexusPost("prescreen.create", {
        patient_uuid,
        requested_ancillary_code,
      });

      // Trigger workflow: add to outreach queue and notify team
      if (data.ok) {
        localData.triggerPrescreenCreated(patient_uuid, requested_ancillary_code);
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to create prescreen" });
    }
  });

  // Update prescreen fields
  app.post("/api/prescreens/update", async (req, res) => {
    try {
      const validation = updatePrescreenSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { prescreen_id, updates } = validation.data;

      const data = await plexusPost("prescreen.update", {
        prescreen_id,
        updates,
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to update prescreen" });
    }
  });

  // Update prescreen status
  app.post("/api/prescreens/status", async (req, res) => {
    try {
      const validation = updateStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { prescreen_id, status } = validation.data;

      const data = await plexusPost("prescreen.updateStatus", {
        prescreen_id,
        status,
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to update prescreen status" });
    }
  });

  // Get eligible patients for an ancillary
  app.get("/api/ancillary/patients", async (req, res) => {
    try {
      const ancillary_code = String(req.query.ancillary_code || "");
      const q = String(req.query.q || "");
      const limit = String(req.query.limit || "50");

      const data = await cachedPlexusGet("ancillary.patients", { ancillary_code, q, limit });
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get eligible patients" });
    }
  });

  // Get ancillary catalog (for dropdown)
  app.get("/api/ancillary/catalog", async (_req, res) => {
    try {
      const data = await cachedPlexusGet("ancillary.catalog");
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get ancillary catalog" });
    }
  });

  // Update ancillary record for a patient
  app.post("/api/ancillary/update", async (req, res) => {
    try {
      const validation = ancillaryUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const data = await plexusPost("ancillary.update", validation.data);
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to update ancillary record" });
    }
  });

  // ==================== BILLING ROUTES ====================

  // Billing validation schemas
  const billingSearchSchema = z.object({
    q: z.string().optional().default(""),
    limit: z.string().optional().default("50"),
    status: z.string().optional(),
  });

  const createInvoiceSchema = z.object({
    patient_uuid: z.string().min(1, "patient_uuid is required"),
    items: z
      .array(
        z.object({
          description: z.string().min(1, "description is required"),
          amount: z.number().min(0, "amount must be non-negative"),
        }),
      )
      .min(1, "at least one item is required"),
    notes: z.string().optional().default(""),
  });

  const updateBillingStatusSchema = z.object({
    billing_id: z.string().min(1, "billing_id is required"),
    status: z.string().min(1, "status is required"),
  });

  // Helper to convert header/rows format to array of objects
  function convertRowsToObjects(header: string[], rows: any[][]): Record<string, any>[] {
    return rows.map((row) => {
      const obj: Record<string, any> = {};
      header.forEach((key, index) => {
        obj[key] = row[index] ?? "";
      });
      return obj;
    });
  }

  // Search billing records (uses billing.search for filtered queries)
  app.get("/api/billing/search", async (req, res) => {
    try {
      const validation = billingSearchSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { q, limit, status } = validation.data;
      const params: Record<string, string> = { q, limit };
      if (status) params.status = status;

      const data = await cachedPlexusGet("billing.search", params);

      // Transform header/rows format to array of objects
      if (data.ok && data.header && data.rows) {
        const rows = convertRowsToObjects(data.header, data.rows);
        res.json({ ok: true, rows, header: data.header });
      } else {
        res.json(data);
      }
    } catch (error) {
      console.error("[billing] Search failed:", error);
      res.status(500).json({ ok: false, error: "Failed to search billing records" });
    }
  });

  // List all billing records with pagination (uses billing.list for full data)
  app.get("/api/billing/list", async (req, res) => {
    try {
      const limit = req.query.limit?.toString() || "200";
      const cursor = req.query.cursor?.toString() || "0";

      const data = await cachedPlexusGet("billing.list", { limit, cursor });

      // Transform header/rows format to array of objects
      if (data.ok && data.header && data.rows) {
        const rows = convertRowsToObjects(data.header, data.rows);
        res.json({
          ok: true,
          rows,
          header: data.header,
          nextCursor: data.nextCursor,
          hasMore: data.hasMore,
        });
      } else {
        res.json(data);
      }
    } catch (error) {
      console.error("[billing] List failed:", error);
      res.status(500).json({ ok: false, error: "Failed to list billing records" });
    }
  });

  // Rebuild billing index - use FULL rebuild for all sheets
  app.post("/api/billing/rebuild-index", async (_req, res) => {
    try {
      const data = await plexusGet("billing.rebuildIndexFull", {});
      res.json(data);
    } catch (error) {
      console.error("[billing] Rebuild index failed:", error);
      res.status(500).json({ ok: false, error: "Failed to rebuild billing index" });
    }
  });

  // Get billing record by ID
  app.get("/api/billing/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ ok: false, error: "billing id is required" });
      }
      const data = await cachedPlexusGet("billing.get", { id });
      res.json(data);
    } catch (error) {
      console.error("[billing] Get record failed:", error);
      res.status(500).json({ ok: false, error: "Failed to get billing record" });
    }
  });

  // Get billing records for a patient
  app.get("/api/patients/:patient_uuid/billing", async (req, res) => {
    try {
      const patient_uuid = req.params.patient_uuid;
      if (!patient_uuid) {
        return res.status(400).json({ ok: false, error: "patient_uuid is required" });
      }
      const data = await cachedPlexusGet("billing.search", { patient_uuid });

      // Transform header/rows format to array of objects
      if (data.ok && data.header && data.rows) {
        const rows = convertRowsToObjects(data.header, data.rows);
        res.json({ ok: true, rows });
      } else {
        res.json(data);
      }
    } catch (error) {
      console.error("[billing] Patient billing fetch failed:", error);
      res.status(500).json({ ok: false, error: "Failed to get patient billing" });
    }
  });

  // Create invoice
  app.post("/api/billing/invoice", async (req, res) => {
    try {
      const validation = createInvoiceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { patient_uuid, items, notes } = validation.data;
      const data = await plexusPost("billing.createInvoice", {
        patient_uuid,
        items,
        notes,
      });

      if (!data.ok) {
        return res.status(400).json({ ok: false, error: data.error || "Invoice creation failed" });
      }
      res.json(data);
    } catch (error) {
      console.error("[billing] Create invoice failed:", error);
      res.status(500).json({ ok: false, error: "Failed to create invoice" });
    }
  });

  // Update billing status
  app.post("/api/billing/update-status", async (req, res) => {
    try {
      const validation = updateBillingStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }

      const { billing_id, status } = validation.data;
      const data = await plexusPost("billing.updateStatus", {
        billing_id,
        status,
      });

      if (!data.ok) {
        return res.status(400).json({ ok: false, error: data.error || "Status update failed" });
      }
      res.json(data);
    } catch (error) {
      console.error("[billing] Update status failed:", error);
      res.status(500).json({ ok: false, error: "Failed to update billing status" });
    }
  });

  // ==================== LOCAL DATA ROUTES ====================

  // Patient profile schemas - matches shared/patientProfile.ts
  const patientProfileSchema = z.object({
    patient_uuid: z.string().min(1),
    medical_history: z.string().optional(),
    medications: z.string().optional(),
    patient_notes: z.string().optional(),
    payor_type: z.enum(["Medicare", "PPO", "Medicaid", "HMO", "Other", "Unknown"]).optional(),
  });

  // Get patient profile (local storage)
  app.get("/api/local/patient-profile/:patient_uuid", async (req, res) => {
    try {
      const { patient_uuid } = req.params;
      const profile = localData.getPatientProfile(patient_uuid);
      res.json({ ok: true, data: profile });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get patient profile" });
    }
  });

  // Save patient profile (local storage)
  app.post("/api/local/patient-profile", async (req, res) => {
    try {
      const validation = patientProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }
      const saved = localData.savePatientProfile(validation.data);
      res.json({ ok: true, data: saved });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to save patient profile" });
    }
  });

  // ==================== SCHEDULE ROUTES ====================

  // Get schedule for date range
  app.get("/api/local/schedule", async (req, res) => {
    try {
      const date = req.query.date?.toString();
      const daysAhead = parseInt(req.query.daysAhead?.toString() || "7", 10);

      let entries;
      if (date) {
        entries = localData.getScheduleByDate(date);
      } else {
        entries = localData.getUpcomingSchedule(daysAhead);
      }
      res.json({ ok: true, data: entries });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get schedule" });
    }
  });

  // Create schedule entry
  app.post("/api/local/schedule", async (req, res) => {
    try {
      const { patient_uuid, patient_name, appointment_datetime, ...options } = req.body;
      const entry = localData.createScheduleEntry(patient_uuid, patient_name, appointment_datetime, options);
      res.json({ ok: true, data: entry });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to create schedule entry" });
    }
  });

  // Update schedule entry
  app.patch("/api/local/schedule/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const existing = localData.getScheduleEntry(id);
      if (!existing) {
        return res.status(404).json({ ok: false, error: "Schedule entry not found" });
      }
      const updated = localData.saveScheduleEntry({ ...existing, ...req.body });
      res.json({ ok: true, data: updated });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to update schedule entry" });
    }
  });

  // ==================== OUTREACH ROUTES ====================

  // Get outreach queue
  app.get("/api/local/outreach", async (req, res) => {
    try {
      const status = req.query.status?.toString();
      const assigned_to = req.query.assigned_to?.toString();

      let records;
      if (status) {
        records = localData.getOutreachByStatus(status as any);
      } else if (assigned_to) {
        records = localData.getOutreachByAssignee(assigned_to);
      } else {
        records = localData.getAllOutreach();
      }
      res.json({ ok: true, data: records });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get outreach records" });
    }
  });

  // Create outreach record
  app.post("/api/local/outreach", async (req, res) => {
    try {
      const { patient_uuid, assigned_to, recommended_ancillaries } = req.body;
      const record = localData.createOutreachRecord(patient_uuid, assigned_to, recommended_ancillaries);
      res.json({ ok: true, data: record });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to create outreach record" });
    }
  });

  // Update outreach record
  app.patch("/api/local/outreach/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const existing = localData.getOutreachRecord(id);
      if (!existing) {
        return res.status(404).json({ ok: false, error: "Outreach record not found" });
      }
      const updated = localData.saveOutreachRecord({ ...existing, ...req.body });
      res.json({ ok: true, data: updated });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to update outreach record" });
    }
  });

  // ==================== NOTIFICATION ROUTES ====================

  // Get notifications for a team
  app.get("/api/local/notifications", async (req, res) => {
    try {
      const { team } = req.query;
      const notifications = team ? localData.getNotifications(String(team)) : localData.getNotifications();
      res.json({ ok: true, data: notifications });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get notifications" });
    }
  });

  // Get unread notifications
  app.get("/api/local/notifications/unread", async (req, res) => {
    try {
      const { team } = req.query;
      const notifications = team ? localData.getUnreadNotifications(String(team)) : localData.getUnreadNotifications();
      res.json({ ok: true, data: notifications, count: notifications.length });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get unread notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/local/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const success = localData.markNotificationRead(id);
      res.json({ ok: success });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to mark notification read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/local/notifications/mark-all-read", async (req, res) => {
    try {
      const { team } = req.body;
      const count = localData.markAllNotificationsRead(team);
      res.json({ ok: true, count });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to mark all notifications read" });
    }
  });

  // Trigger report uploaded notification (called when report is uploaded)
  app.post("/api/local/trigger/report-uploaded", async (req, res) => {
    try {
      const { patient_uuid, ancillary_code, patient_name } = req.body;
      localData.triggerReportUploaded(patient_uuid, ancillary_code, patient_name);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to trigger report uploaded" });
    }
  });

  // Trigger service completed notification
  app.post("/api/local/trigger/service-completed", async (req, res) => {
    try {
      const { patient_uuid, ancillary_code, patient_name } = req.body;
      localData.triggerServiceCompleted(patient_uuid, ancillary_code, patient_name);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to trigger service completed" });
    }
  });

  // ==================== AI ANALYSIS ROUTES ====================

  // Get ancillary catalog (local)
  app.get("/api/local/ancillary-catalog", async (_req, res) => {
    res.json({ ok: true, data: ANCILLARY_CATALOG });
  });

  // AI-powered patient analysis
  app.post("/api/ai/analyze-patient", async (req, res) => {
    try {
      const { patient_uuid, patientData } = req.body;

      let profile = localData.getPatientProfile(patient_uuid);
      if (!profile) {
        profile = { patient_uuid, medical_history: "", medications: "", patient_notes: "" };
      }

      const result = await analyzePatientForAncillaries(patient_uuid, profile, patientData || {});
      res.json({ ok: true, data: result });
    } catch (error) {
      console.error("[ai] Analysis failed:", error);
      res.status(500).json({ ok: false, error: "AI analysis failed" });
    }
  });

  // Generate evidence summary for a specific ancillary
  app.post("/api/ai/evidence-summary", async (req, res) => {
    try {
      const { ancillary_code, clinical_context } = req.body;
      const summary = await generateEvidenceSummary(ancillary_code, clinical_context);
      res.json({ ok: true, data: summary });
    } catch (error) {
      console.error("[ai] Evidence summary failed:", error);
      res.status(500).json({ ok: false, error: "Evidence summary failed" });
    }
  });

  // ==================== ONE-TIME S3 → POSTGRES IMPORT ====================

  app.post("/api/admin/import-sheets", async (req, res) => {
    const token = req.headers["x-admin-token"];
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return res.status(403).json({ ok: false, error: "forbidden" });
    }

    const REGION = process.env.AWS_REGION || "us-east-2";
    const BUCKET = process.env.SHEETS_BUCKET || "plexus-sheets-raw";
    const PREFIX = process.env.SHEETS_PREFIX || "exports/";

    const s3 = new S3Client({ region: REGION });
    const pg = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await pg.connect();
    await pg.query(`CREATE SCHEMA IF NOT EXISTS sheets_raw;`);

    const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX }));
    const keys = (list.Contents || []).map((x) => x.Key!).filter((k) => k.toLowerCase().endsWith(".csv"));

    for (const key of keys) {
      const table = (key.split("/").pop() || key)
        .replace(/\.csv$/i, "")
        .replace(/[^a-z0-9]+/gi, "_")
        .toLowerCase();

      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

      const chunks: Buffer[] = [];
      for await (const chunk of obj.Body as any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const text = Buffer.concat(chunks).toString("utf8");
      const rows = parse(text, { columns: true, skip_empty_lines: true });

      await pg.query(`CREATE TABLE IF NOT EXISTS sheets_raw.${table} (id bigserial PRIMARY KEY, row jsonb);`);
      await pg.query(`TRUNCATE sheets_raw.${table};`);

      for (const r of rows) {
        await pg.query(`INSERT INTO sheets_raw.${table}(row) VALUES ($1)`, [r]);
      }
    }

    await pg.end();
    return res.json({ ok: true, imported: keys.length });
  });

  return httpServer;
}

