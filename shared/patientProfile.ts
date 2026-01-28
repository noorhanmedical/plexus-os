import { z } from "zod";

export const patientProfileSchema = z.object({
  patient_uuid: z.string(),
  medical_history: z.string().optional(),
  medications: z.string().optional(),
  patient_notes: z.string().optional(),
  payor_type: z.enum(["PPO", "Medicare", "Medicaid", "HMO", "Other", "Unknown"]).optional(),
  last_updated: z.string().optional(),
});

export type PatientProfile = z.infer<typeof patientProfileSchema>;

export const outreachRecordSchema = z.object({
  id: z.string(),
  patient_uuid: z.string(),
  assigned_to: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "callback", "no_answer", "voicemail"]),
  call_notes: z.string().optional(),
  scheduled_callback: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  recommended_ancillaries: z.array(z.string()).optional(),
});

export type OutreachRecord = z.infer<typeof outreachRecordSchema>;

export const scheduleEntrySchema = z.object({
  id: z.string(),
  patient_uuid: z.string(),
  patient_name: z.string(),
  appointment_datetime: z.string(),
  appointment_type: z.string().optional(),
  clinician: z.string().optional(),
  location: z.string().optional(),
  prescreen_status: z.enum(["pending", "in_progress", "completed", "not_needed"]).optional(),
  recommended_ancillaries: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;

export const eligibilityRecordSchema = z.object({
  patient_uuid: z.string(),
  ancillary_code: z.string(),
  last_completed_date: z.string(),
  next_eligible_date: z.string(),
  payor_type: z.string(),
  cooldown_months: z.number(),
  status: z.enum(["eligible", "not_yet_eligible", "overdue"]),
});

export type EligibilityRecord = z.infer<typeof eligibilityRecordSchema>;

export const resourceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["screening_questions", "flyer", "video", "faq", "script"]),
  ancillary_codes: z.array(z.string()).optional(),
  url: z.string().optional(),
  content: z.string().optional(),
  can_send_email: z.boolean(),
  can_send_sms: z.boolean(),
});

export type ResourceItem = z.infer<typeof resourceItemSchema>;
