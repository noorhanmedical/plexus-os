import type { PatientProfile, OutreachRecord, ScheduleEntry } from "../shared/patientProfile";

// Notification types for workflow triggers
export interface Notification {
  id: string;
  type: "prescreen_created" | "report_uploaded" | "service_completed" | "billing_ready";
  patient_uuid: string;
  patient_name?: string;
  ancillary_code?: string;
  message: string;
  read: boolean;
  created_at: string;
  target_team: "outreach" | "billing" | "clinical";
}

const patientProfiles = new Map<string, PatientProfile>();
const outreachRecords = new Map<string, OutreachRecord>();
const scheduleEntries = new Map<string, ScheduleEntry>();
const notifications = new Map<string, Notification>();

export function getPatientProfile(patient_uuid: string): PatientProfile | null {
  return patientProfiles.get(patient_uuid) || null;
}

export function savePatientProfile(profile: PatientProfile): PatientProfile {
  profile.last_updated = new Date().toISOString();
  patientProfiles.set(profile.patient_uuid, profile);
  return profile;
}

export function getAllPatientProfiles(): PatientProfile[] {
  return Array.from(patientProfiles.values());
}

export function getOutreachRecord(id: string): OutreachRecord | null {
  return outreachRecords.get(id) || null;
}

export function getOutreachByPatient(patient_uuid: string): OutreachRecord[] {
  return Array.from(outreachRecords.values()).filter((r) => r.patient_uuid === patient_uuid);
}

export function getOutreachByStatus(status: OutreachRecord["status"]): OutreachRecord[] {
  return Array.from(outreachRecords.values()).filter((r) => r.status === status);
}

export function getOutreachByAssignee(assigned_to: string): OutreachRecord[] {
  return Array.from(outreachRecords.values()).filter((r) => r.assigned_to === assigned_to);
}

export function getAllOutreach(): OutreachRecord[] {
  return Array.from(outreachRecords.values());
}

export function saveOutreachRecord(record: OutreachRecord): OutreachRecord {
  record.updated_at = new Date().toISOString();
  outreachRecords.set(record.id, record);
  return record;
}

export function createOutreachRecord(
  patient_uuid: string,
  assigned_to?: string,
  recommended_ancillaries?: string[]
): OutreachRecord {
  const id = `outreach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const record: OutreachRecord = {
    id,
    patient_uuid,
    assigned_to,
    status: "pending",
    recommended_ancillaries,
    created_at: now,
    updated_at: now,
  };
  outreachRecords.set(id, record);
  return record;
}

export function deleteOutreachRecord(id: string): boolean {
  return outreachRecords.delete(id);
}

export function getScheduleEntry(id: string): ScheduleEntry | null {
  return scheduleEntries.get(id) || null;
}

export function getScheduleByDate(date: string): ScheduleEntry[] {
  const targetDate = new Date(date).toDateString();
  return Array.from(scheduleEntries.values()).filter((e) => {
    const entryDate = new Date(e.appointment_datetime).toDateString();
    return entryDate === targetDate;
  });
}

export function getScheduleByDateRange(startDate: string, endDate: string): ScheduleEntry[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Array.from(scheduleEntries.values()).filter((e) => {
    const entryTime = new Date(e.appointment_datetime).getTime();
    return entryTime >= start && entryTime <= end;
  });
}

export function getUpcomingSchedule(daysAhead: number = 7): ScheduleEntry[] {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  return getScheduleByDateRange(now.toISOString(), future.toISOString()).sort(
    (a, b) => new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime()
  );
}

export function getAllSchedule(): ScheduleEntry[] {
  return Array.from(scheduleEntries.values());
}

export function saveScheduleEntry(entry: ScheduleEntry): ScheduleEntry {
  scheduleEntries.set(entry.id, entry);
  return entry;
}

export function createScheduleEntry(
  patient_uuid: string,
  patient_name: string,
  appointment_datetime: string,
  options?: Partial<ScheduleEntry>
): ScheduleEntry {
  const id = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const entry: ScheduleEntry = {
    id,
    patient_uuid,
    patient_name,
    appointment_datetime,
    prescreen_status: "pending",
    ...options,
  };
  scheduleEntries.set(id, entry);
  return entry;
}

export function deleteScheduleEntry(id: string): boolean {
  return scheduleEntries.delete(id);
}

// Notification functions
export function createNotification(
  type: Notification["type"],
  patient_uuid: string,
  message: string,
  target_team: Notification["target_team"],
  options?: { patient_name?: string; ancillary_code?: string }
): Notification {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const notification: Notification = {
    id,
    type,
    patient_uuid,
    patient_name: options?.patient_name,
    ancillary_code: options?.ancillary_code,
    message,
    read: false,
    created_at: new Date().toISOString(),
    target_team,
  };
  notifications.set(id, notification);
  return notification;
}

export function getNotifications(target_team?: string): Notification[] {
  const all = Array.from(notifications.values());
  if (target_team) {
    return all.filter(n => n.target_team === target_team).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  return all.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getUnreadNotifications(target_team?: string): Notification[] {
  return getNotifications(target_team).filter(n => !n.read);
}

export function markNotificationRead(id: string): boolean {
  const notification = notifications.get(id);
  if (notification) {
    notification.read = true;
    notifications.set(id, notification);
    return true;
  }
  return false;
}

export function markAllNotificationsRead(target_team?: string): number {
  let count = 0;
  notifications.forEach((n, id) => {
    if (!target_team || n.target_team === target_team) {
      if (!n.read) {
        n.read = true;
        notifications.set(id, n);
        count++;
      }
    }
  });
  return count;
}

// Workflow triggers
export function triggerPrescreenCreated(patient_uuid: string, ancillary_code: string, patient_name?: string): void {
  // Add to outreach queue automatically
  const existingOutreach = getOutreachByPatient(patient_uuid);
  const hasExisting = existingOutreach.some(o => 
    o.status === "pending" && o.recommended_ancillaries?.includes(ancillary_code)
  );
  
  if (!hasExisting) {
    createOutreachRecord(patient_uuid, undefined, [ancillary_code]);
  }
  
  // Create notification for outreach team
  createNotification(
    "prescreen_created",
    patient_uuid,
    `New ${ancillary_code} prescreen created for ${patient_name || "patient"}`,
    "outreach",
    { patient_name, ancillary_code }
  );
}

export function triggerReportUploaded(patient_uuid: string, ancillary_code: string, patient_name?: string): void {
  // Notify billing team
  createNotification(
    "report_uploaded",
    patient_uuid,
    `Report uploaded for ${patient_name || "patient"} - ${ancillary_code} ready for billing`,
    "billing",
    { patient_name, ancillary_code }
  );
}

export function triggerServiceCompleted(patient_uuid: string, ancillary_code: string, patient_name?: string): void {
  // Move to billing queue (create billing-ready notification)
  createNotification(
    "billing_ready",
    patient_uuid,
    `${ancillary_code} service completed for ${patient_name || "patient"} - ready to bill`,
    "billing",
    { patient_name, ancillary_code }
  );
}

export function seedDemoData() {
  const demoPatients = [
    {
      patient_uuid: "pt_demo_001",
      medical_history: "Hypertension\nType 2 Diabetes\nHyperlipidemia\nObesity (BMI 32)",
      medications: "Metformin 500mg BID\nLisinopril 10mg daily\nAtorvastatin 20mg daily\nAspirin 81mg daily",
      patient_notes: "Patient prefers morning appointments. Daughter is healthcare proxy.",
      payor_type: "Medicare" as const,
    },
    {
      patient_uuid: "pt_demo_002",
      medical_history: "Coronary Artery Disease\nHypertension\nAnxiety\nInsomnia",
      medications: "Metoprolol 50mg BID\nAmlodipine 5mg daily\nSertraline 50mg daily\nTrazodone 50mg PRN",
      patient_notes: "History of cardiac stent placement 2022. Compliant with medications.",
      payor_type: "PPO" as const,
    },
    {
      patient_uuid: "pt_demo_003",
      medical_history: "Peripheral Artery Disease\nType 2 Diabetes\nChronic Kidney Disease Stage 3\nNeuropathy",
      medications: "Cilostazol 100mg BID\nGlipizide 5mg daily\nGabapentin 300mg TID\nLosartan 50mg daily",
      patient_notes: "Leg claudication symptoms. Uses walker for mobility.",
      payor_type: "Medicare" as const,
    },
  ];

  demoPatients.forEach((p) => savePatientProfile(p));

  const now = new Date();
  const demoSchedule = [
    {
      patient_uuid: "pt_demo_001",
      patient_name: "Smith, John",
      appointment_datetime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      appointment_type: "Follow-up",
      clinician: "Dr. Patel",
      location: "NWPG Spring",
      prescreen_status: "pending" as const,
    },
    {
      patient_uuid: "pt_demo_002",
      patient_name: "Davis, Mary",
      appointment_datetime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      appointment_type: "Annual Physical",
      clinician: "Dr. Lee",
      location: "ServMD Glendale",
      prescreen_status: "in_progress" as const,
    },
    {
      patient_uuid: "pt_demo_003",
      patient_name: "Johnson, Robert",
      appointment_datetime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      appointment_type: "Vascular Consult",
      clinician: "Dr. Wong",
      location: "Taylor Family Practice",
      prescreen_status: "completed" as const,
      recommended_ancillaries: ["BRAINWAVE", "VITALWAVE", "US_LE_ARTERIAL_93925"],
    },
  ];

  demoSchedule.forEach((s) => createScheduleEntry(s.patient_uuid, s.patient_name, s.appointment_datetime, s));

  const demoOutreach = [
    {
      patient_uuid: "pt_demo_001",
      assigned_to: "Sarah M.",
      status: "pending" as const,
      recommended_ancillaries: ["BRAINWAVE", "VITALWAVE", "US_ECHO_93306"],
    },
    {
      patient_uuid: "pt_demo_002",
      assigned_to: "Mike T.",
      status: "voicemail" as const,
      call_notes: "Left message regarding upcoming appointment and ancillary options.",
      recommended_ancillaries: ["BRAINWAVE", "US_CAROTID_93880"],
    },
  ];

  demoOutreach.forEach((o) => {
    const record = createOutreachRecord(o.patient_uuid, o.assigned_to, o.recommended_ancillaries);
    if (o.status !== "pending") {
      record.status = o.status;
      record.call_notes = o.call_notes;
      saveOutreachRecord(record);
    }
  });
}

seedDemoData();
