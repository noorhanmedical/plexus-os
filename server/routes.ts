import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";

const PLEXUS_API_URL = "https://script.google.com/macros/s/AKfycbxNwZ6W5HhBFekOSU1de5jeTFCIc99O2yXLGhSAwSzBMhJpkE8iNi9xcDrcm8eX0l0w/exec";
const PLEXUS_API_KEY = process.env.PLEXUS_API_KEY || "";

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

async function plexusGet(action: string, params: Record<string, string> = {}): Promise<any> {
  const searchParams = new URLSearchParams({
    action,
    api_key: PLEXUS_API_KEY,
    ...params,
  });
  
  const response = await fetch(`${PLEXUS_API_URL}?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      "x-api-key": PLEXUS_API_KEY,
    },
  });
  
  return response.json();
}

async function plexusPost(action: string, payload: Record<string, any> = {}): Promise<any> {
  const response = await fetch(`${PLEXUS_API_URL}?api_key=${PLEXUS_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": PLEXUS_API_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  
  return response.json();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check
  app.get("/api/health", async (_req, res) => {
    try {
      const data = await plexusGet("health");
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to connect to Plexus API" });
    }
  });

  // Search patients
  app.get("/api/patients/search", async (req, res) => {
    try {
      const validation = searchPatientsSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ ok: false, error: validation.error.message });
      }
      
      const { query, limit } = validation.data;
      const data = await plexusGet("patients.search", { q: query, limit });
      res.json(data);
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
      const data = await plexusGet("patients.get", { patient_uuid });
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
      
      const data = await plexusGet("prescreen.list", params);
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
      
      const data = await plexusGet("ancillary.patients", { ancillary_code, q, limit });
      res.json(data);
    } catch (error) {
      res.status(500).json({ ok: false, error: "Failed to get eligible patients" });
    }
  });

  // Get ancillary catalog (for dropdown)
  app.get("/api/ancillary/catalog", async (_req, res) => {
    try {
      const data = await plexusGet("ancillary.catalog");
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

  return httpServer;
}
