import { useState } from "react";
import { PatientSearch } from "@/components/PatientSearch";
import { PrescreenList } from "@/components/PrescreenList";
import { PrescreenDetail } from "@/components/PrescreenDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Patient, Prescreen } from "@shared/schema";

export function PatientProfileView() {
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
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
      <div className="col-span-3">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Patients</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <PatientSearch
              onPatientSelect={handlePatientSelect}
              selectedPatientId={selectedPatient?.patient_uuid}
            />
          </CardContent>
        </Card>
      </div>

      <div className="col-span-4">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : "Prescreens"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <PrescreenList
              patient={selectedPatient}
              onPrescreenSelect={handlePrescreenSelect}
              selectedPrescreenId={selectedPrescreen?.prescreen_id}
              refreshTrigger={refreshTrigger}
            />
          </CardContent>
        </Card>
      </div>

      <div className="col-span-5">
        <Card className="h-full overflow-hidden">
          <CardContent className="p-0 h-full">
            <PrescreenDetail
              prescreen={selectedPrescreen}
              onSave={handlePrescreenSave}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
