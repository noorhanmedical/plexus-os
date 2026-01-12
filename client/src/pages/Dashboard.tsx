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
    <div className="flex h-full gap-4">
      <div className="w-80 bg-white rounded-lg shadow-lg flex-shrink-0 overflow-hidden border border-gray-200">
        <PatientSearch
          onPatientSelect={handlePatientSelect}
          selectedPatientId={selectedPatient?.patient_uuid}
        />
      </div>

      <div className="w-96 bg-white rounded-lg shadow-lg flex-shrink-0 overflow-hidden border border-gray-200">
        <PrescreenList
          patient={selectedPatient}
          onPrescreenSelect={handlePrescreenSelect}
          selectedPrescreenId={selectedPrescreen?.prescreen_id}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-lg min-w-0 overflow-hidden border border-gray-200">
        <PrescreenDetail
          prescreen={selectedPrescreen}
          onSave={handlePrescreenSave}
        />
      </div>
    </div>
  );
}
