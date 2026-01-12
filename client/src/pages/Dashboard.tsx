import { useState } from "react";
import { PatientSearch } from "@/components/PatientSearch";
import { PrescreenList } from "@/components/PrescreenList";
import { PrescreenDetail } from "@/components/PrescreenDetail";
import type { Patient, Prescreen } from "@shared/schema";

export default function Dashboard() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPrescreen, setSelectedPrescreen] = useState<Prescreen | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedPrescreen(null);
  };

  const handlePrescreenSelect = (prescreen: Prescreen) => {
    setSelectedPrescreen(prescreen);
  };

  const handlePrescreenSave = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-border bg-card flex-shrink-0">
        <PatientSearch
          onPatientSelect={handlePatientSelect}
          selectedPatientId={selectedPatient?.patient_uuid}
        />
      </div>

      <div className="w-96 border-r border-border bg-background flex-shrink-0">
        <PrescreenList
          patient={selectedPatient}
          onPrescreenSelect={handlePrescreenSelect}
          selectedPrescreenId={selectedPrescreen?.prescreen_id}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <div className="flex-1 bg-background min-w-0">
        <PrescreenDetail
          prescreen={selectedPrescreen}
          onSave={handlePrescreenSave}
        />
      </div>
    </div>
  );
}
