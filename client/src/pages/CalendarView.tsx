import { useState, useEffect } from "react";
import { Plus, Search, Loader2, ChevronLeft, ChevronRight, Trash2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Patient } from "@shared/schema";

interface RosterPatient {
  patient: Patient;
  room: string;
  pmh: string;
  meds: string;
  ancillaries: string[];
}

const ANCILLARY_CATALOG = [
  { code: "93880", name: "Carotid Duplex", interval_rule: "12mo" },
  { code: "93306", name: "Echocardiogram", interval_rule: "12mo" },
  { code: "93975", name: "Abdominal Duplex", interval_rule: "6mo" },
  { code: "93970", name: "Lower Extremity Venous", interval_rule: "6mo" },
  { code: "93971", name: "Unilateral Venous", interval_rule: "none" },
  { code: "76536", name: "Thyroid Ultrasound", interval_rule: "12mo" },
];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [roster, setRoster] = useState<RosterPatient[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  const dateKey = formatDate(selectedDate);

  useEffect(() => {
    const saved = localStorage.getItem(`roster-${dateKey}`);
    if (saved) {
      setRoster(JSON.parse(saved));
    } else {
      setRoster([]);
    }
  }, [dateKey]);

  useEffect(() => {
    if (roster.length > 0) {
      localStorage.setItem(`roster-${dateKey}`, JSON.stringify(roster));
    }
  }, [roster, dateKey]);

  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`/api/patients/search?query=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      if (data.ok) {
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchPatients(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addPatientToRoster = async (patient: Patient) => {
    if (roster.some((r) => r.patient.patient_uuid === patient.patient_uuid)) {
      return;
    }

    let pmh = "Not available";
    let meds = "Not available";

    try {
      const response = await fetch(`/api/patients/${patient.patient_uuid}`);
      const data = await response.json();
      if (data.ok && data.data) {
        pmh = data.data.pmh || data.data.pulled_pmh_snapshot || "Not available";
        meds = data.data.meds || data.data.pulled_meds_snapshot || "Not available";
      }
    } catch (err) {
      console.error(err);
    }

    setRoster([...roster, { patient, room: "", pmh, meds, ancillaries: [] }]);
    setIsAddOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removePatient = (patientUuid: string) => {
    const newRoster = roster.filter((r) => r.patient.patient_uuid !== patientUuid);
    setRoster(newRoster);
    if (newRoster.length === 0) {
      localStorage.removeItem(`roster-${dateKey}`);
    }
  };

  const updateRoom = (patientUuid: string, room: string) => {
    setRoster(roster.map((r) => (r.patient.patient_uuid === patientUuid ? { ...r, room } : r)));
  };

  const toggleAncillary = (patientUuid: string, code: string) => {
    setRoster(
      roster.map((r) => {
        if (r.patient.patient_uuid !== patientUuid) return r;
        const ancillaries = r.ancillaries.includes(code)
          ? r.ancillaries.filter((a) => a !== code)
          : [...r.ancillaries, code];
        return { ...r, ancillaries };
      })
    );
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">Daily Prescreen Roster</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} data-testid="button-prev-day">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={dateKey}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-40"
                data-testid="input-date-picker"
              />
              <Button variant="outline" size="icon" onClick={() => navigateDate(1)} data-testid="button-next-day">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-patient">
                <Plus className="h-4 w-4 mr-2" />
                Add Patient to Today
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Search Patient</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-patient-modal"
                  />
                </div>
                <ScrollArea className="h-64">
                  {isSearching && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!isSearching && searchResults.length === 0 && searchQuery && (
                    <p className="text-center text-muted-foreground text-sm py-4">No patients found</p>
                  )}
                  {searchResults.map((patient) => (
                    <button
                      key={patient.patient_uuid}
                      onClick={() => addPatientToRoster(patient)}
                      className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                      data-testid={`button-add-${patient.patient_uuid}`}
                    >
                      <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                      {patient.date_of_birth && (
                        <p className="text-xs text-muted-foreground">DOB: {patient.date_of_birth}</p>
                      )}
                    </button>
                  ))}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">No patients scheduled for this date</p>
              <p className="text-sm">Click "Add Patient to Today" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {roster.map((entry) => (
                <Card 
                  key={entry.patient.patient_uuid} 
                  className={expandedPatient === entry.patient.patient_uuid ? "ring-2 ring-primary" : ""}
                >
                  <CardContent className="pt-4">
                    <div 
                      className="cursor-pointer"
                      onClick={() => setExpandedPatient(
                        expandedPatient === entry.patient.patient_uuid ? null : entry.patient.patient_uuid
                      )}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">
                              {entry.patient.first_name} {entry.patient.last_name}
                            </h4>
                            {entry.patient.date_of_birth && (
                              <span className="text-sm text-muted-foreground">
                                DOB: {entry.patient.date_of_birth}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-sm text-muted-foreground">Room:</label>
                            <Input
                              value={entry.room}
                              onChange={(e) => updateRoom(entry.patient.patient_uuid, e.target.value)}
                              className="w-20 h-8"
                              placeholder="—"
                              data-testid={`input-room-${entry.patient.patient_uuid}`}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePatient(entry.patient.patient_uuid);
                            }}
                            data-testid={`button-remove-${entry.patient.patient_uuid}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">PMH:</span>
                          <p className="mt-1">{entry.pmh}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Medications:</span>
                          <p className="mt-1">{entry.meds}</p>
                        </div>
                      </div>

                      <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-muted-foreground mb-2 block">Ancillaries:</span>
                        <div className="flex flex-wrap gap-2">
                          {ANCILLARY_CATALOG.map((anc) => {
                            const isSelected = entry.ancillaries.includes(anc.code);
                            return (
                              <Badge
                                key={anc.code}
                                variant={isSelected ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => toggleAncillary(entry.patient.patient_uuid, anc.code)}
                                data-testid={`badge-anc-${entry.patient.patient_uuid}-${anc.code}`}
                              >
                                {isSelected && <Check className="h-3 w-3 mr-1" />}
                                {anc.code} - {anc.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {entry.ancillaries.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-secondary/50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Candidate (not ordered)
                          </Badge>
                        </div>
                      )}
                    </div>

                    {expandedPatient === entry.patient.patient_uuid && entry.ancillaries.length > 0 && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <h5 className="font-medium">Eligibility & Reasoning</h5>
                        {entry.ancillaries.map((code) => {
                          const anc = ANCILLARY_CATALOG.find((a) => a.code === code);
                          return (
                            <div key={code} className="p-3 bg-muted/50 rounded-md space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{anc?.name} ({code})</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Allowed
                                </Badge>
                              </div>
                              <textarea
                                className="w-full p-2 text-sm border rounded-md bg-background"
                                placeholder="Enter reasoning..."
                                rows={2}
                                data-testid={`textarea-reasoning-${entry.patient.patient_uuid}-${code}`}
                              />
                            </div>
                          );
                        })}
                        <div className="flex gap-2">
                          <Button data-testid={`button-save-candidates-${entry.patient.patient_uuid}`}>
                            Save Candidates
                          </Button>
                          <Button variant="outline" disabled>
                            Convert to Order
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
