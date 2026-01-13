import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, Loader2, Phone, Mail, MapPin, Calendar, ExternalLink } from "lucide-react";
import type { Patient } from "@shared/schema";

interface PatientSearchViewProps {
  onPatientSelect?: (patient: Patient) => void;
}

export function PatientSearchView({ onPatientSelect }: PatientSearchViewProps) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const searchPatients = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setPatients([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/patients/search?query=${encodeURIComponent(searchQuery)}&limit=20`);
      const data = await response.json();
      
      if (data.ok) {
        setPatients(data.data || []);
      } else {
        setError(data.error || "Failed to search patients");
        setPatients([]);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, searchPatients]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
      <Card className="glow-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Patient Search
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-patient-search"
              placeholder="Search by name, MRN, or phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-18rem)]">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {!isLoading && !error && patients.length === 0 && query && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No patients found
              </div>
            )}

            {!isLoading && !error && patients.length === 0 && !query && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Type to search patients
              </div>
            )}

            <div className="p-2 space-y-1">
              {patients.map((patient) => (
                <button
                  key={patient.patient_uuid}
                  data-testid={`patient-item-${patient.patient_uuid}`}
                  onClick={() => setSelectedPatient(patient)}
                  className={`w-full text-left p-3 rounded-lg hover-elevate ${
                    selectedPatient?.patient_uuid === patient.patient_uuid
                      ? "bg-primary/20 border border-primary/40"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {patient.first_name} {patient.last_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {patient.mrn && <span>MRN: {patient.mrn}</span>}
                        {patient.date_of_birth && <span>DOB: {patient.date_of_birth}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 glow-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Patient Details</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedPatient ? (
            <ScrollArea className="h-[calc(100vh-18rem)]">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedPatient.first_name} {selectedPatient.middle_name || ""} {selectedPatient.last_name} {selectedPatient.suffix || ""}
                    </h2>
                    {selectedPatient.preferred_name && (
                      <p className="text-muted-foreground">Preferred: {selectedPatient.preferred_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {selectedPatient.mrn && (
                        <Badge variant="outline">MRN: {selectedPatient.mrn}</Badge>
                      )}
                      {selectedPatient.record_status && (
                        <Badge className={selectedPatient.record_status === "Active" ? "bg-[#1a3d2e]/40 text-[#4a9a7c] border-[#1a3d2e]" : "bg-slate-700/30 text-slate-400 border-slate-700"}>
                          {selectedPatient.record_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Demographics</h3>
                    <div className="space-y-3">
                      {selectedPatient.date_of_birth && (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedPatient.date_of_birth}</span>
                        </div>
                      )}
                      {selectedPatient.sex_assigned_at_birth && (
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedPatient.sex_assigned_at_birth}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Contact</h3>
                    <div className="space-y-3">
                      {selectedPatient.primary_phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedPatient.primary_phone}</span>
                        </div>
                      )}
                      {selectedPatient.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{selectedPatient.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(selectedPatient.address_line_1 || selectedPatient.city) && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">Address</h3>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        {selectedPatient.address_line_1 && <p>{selectedPatient.address_line_1}</p>}
                        {selectedPatient.address_line_2 && <p>{selectedPatient.address_line_2}</p>}
                        <p>
                          {selectedPatient.city && `${selectedPatient.city}, `}
                          {selectedPatient.state} {selectedPatient.zip_code}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedPatient.payor_type || selectedPatient.payor_name) && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">Insurance</h3>
                    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                      {selectedPatient.payor_type && (
                        <p><span className="text-muted-foreground">Type:</span> {selectedPatient.payor_type}</p>
                      )}
                      {selectedPatient.payor_name && (
                        <p><span className="text-muted-foreground">Payor:</span> {selectedPatient.payor_name}</p>
                      )}
                      {selectedPatient.policy_id_member_id && (
                        <p><span className="text-muted-foreground">Member ID:</span> {selectedPatient.policy_id_member_id}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedPatient.notes && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">Notes</h3>
                    <p className="p-3 rounded-lg bg-muted/50 text-sm">{selectedPatient.notes}</p>
                  </div>
                )}

                {onPatientSelect && (
                  <Button 
                    onClick={() => onPatientSelect(selectedPatient)}
                    className="w-full bg-[#3d2e1a] hover:bg-[#5a4528] text-white"
                    data-testid="button-open-patient-profile"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Full Patient Chart
                  </Button>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[calc(100vh-18rem)] flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <User className="h-12 w-12 mx-auto opacity-50" />
                <p>Select a patient to view details</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
