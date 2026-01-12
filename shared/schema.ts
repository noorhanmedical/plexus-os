import { z } from "zod";

// Patient schema
export const patientSchema = z.object({
  patient_uuid: z.string(),
  patient_id_external: z.string().optional(),
  mrn: z.string().optional(),
  first_name: z.string(),
  middle_name: z.string().optional(),
  last_name: z.string(),
  suffix: z.string().optional(),
  preferred_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  sex_assigned_at_birth: z.string().optional(),
  primary_phone: z.string().optional(),
  email: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  payor_type: z.string().optional(),
  payor_name: z.string().optional(),
  policy_id_member_id: z.string().optional(),
  record_status: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  notes: z.string().optional(),
  patient_fingerprint: z.string().optional(),
});

export type Patient = z.infer<typeof patientSchema>;

// Prescreen schema
export const prescreenSchema = z.object({
  prescreen_id: z.string(),
  patient_uuid: z.string(),
  requested_ancillary_code: z.string(),
  prescreen_status: z.string().optional(),
  eligibility_status: z.string().optional(),
  eligibility_reason: z.string().optional(),
  eligible_after_date: z.string().optional(),
  scheduled_datetime: z.string().optional(),
  location: z.string().optional(),
  assigned_staff: z.string().optional(),
  notes: z.string().optional(),
  cleared_by: z.string().optional(),
  cleared_datetime: z.string().optional(),
  pulled_pmh_snapshot: z.string().optional(),
  pulled_meds_snapshot: z.string().optional(),
  prior_ancillaries_summary: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  last_completed_date_calc: z.union([z.string(), z.number()]).optional(),
  eligibility_override_reason: z.string().optional(),
  cooldown_months_applied_calc: z.string().optional(),
  eligible_after_date_calc: z.string().optional(),
  eligibility_status_calc: z.string().optional(),
  eligibility_reason_calc: z.string().optional(),
  eligibility_status_final: z.string().optional(),
});

export type Prescreen = z.infer<typeof prescreenSchema>;

// Prescreen status options
export const PRESCREEN_STATUSES = [
  "Needs Review",
  "Eligible",
  "Not Eligible", 
  "Scheduled",
  "Completed",
] as const;

export type PrescreenStatus = typeof PRESCREEN_STATUSES[number];

// API response types
export interface ApiResponse<T> {
  ok: boolean;
  action: string;
  data: T;
  error?: string;
}

// Insert/Update schemas
export const createPrescreenSchema = z.object({
  patient_uuid: z.string(),
  requested_ancillary_code: z.string(),
});

export type CreatePrescreen = z.infer<typeof createPrescreenSchema>;

export const updatePrescreenSchema = z.object({
  prescreen_id: z.string(),
  updates: z.object({
    scheduled_datetime: z.string().optional(),
    assigned_staff: z.string().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export type UpdatePrescreen = z.infer<typeof updatePrescreenSchema>;

export const updatePrescreenStatusSchema = z.object({
  prescreen_id: z.string(),
  status: z.string(),
});

export type UpdatePrescreenStatus = z.infer<typeof updatePrescreenStatusSchema>;
