import { useState, useEffect, useCallback } from "react";
import { Search, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Patient } from "@shared/schema";

interface PatientSearchProps {
  onPatientSelect: (patient: Patient) => void;
  selectedPatientId?: string;
}

export function PatientSearch({ onPatientSelect, selectedPatientId }: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const debounceTimer = setTimeout(() => {
      searchPatients(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, searchPatients]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Patient Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            data-testid="input-patient-search"
            placeholder="Search patients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && patients.length === 0 && query && (
          <div className="p-4 text-sm text-gray-500 text-center">
            No patients found
          </div>
        )}

        {!isLoading && !error && patients.length === 0 && !query && (
          <div className="p-4 text-sm text-gray-500 text-center">
            Type to search patients
          </div>
        )}

        <div className="p-2">
          {patients.map((patient) => (
            <button
              key={patient.patient_uuid}
              data-testid={`button-patient-${patient.patient_uuid}`}
              onClick={() => onPatientSelect(patient)}
              className={`w-full text-left p-3 rounded-md mb-1 transition-colors border ${
                selectedPatientId === patient.patient_uuid
                  ? "bg-blue-50 border-blue-300"
                  : "border-transparent hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {patient.first_name} {patient.last_name}
                  </p>
                  {patient.mrn && (
                    <p className="text-xs text-gray-500">
                      MRN: {patient.mrn}
                    </p>
                  )}
                  {patient.date_of_birth && (
                    <p className="text-xs text-gray-500">
                      DOB: {patient.date_of_birth}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
