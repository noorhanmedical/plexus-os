import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity, Search, Loader2, User, Users, TestTube } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, type KeyboardEvent } from "react";

interface EligiblePatient {
  patient_uuid: string;
  first_name: string;
  last_name: string;
  mrn?: string;
  date_of_birth?: string;
  eligibility_reason?: string;
}

interface AncillaryPatientsResponse {
  ok: boolean;
  action?: string;
  ancillary_code?: string;
  count?: number;
  results?: EligiblePatient[];
  error?: string;
}

export function AncillaryDashboard() {
  const [ancillaryCode, setAncillaryCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");

  const { data: response, isLoading, error, isFetching } = useQuery<AncillaryPatientsResponse>({
    queryKey: ["/api/ancillary/patients", submittedCode, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (submittedCode) params.set("ancillary_code", submittedCode);
      if (searchQuery) params.set("q", searchQuery);
      params.set("limit", "50");
      const res = await fetch(`/api/ancillary/patients?${params.toString()}`);
      return res.json();
    },
    enabled: submittedCode.length > 0,
    staleTime: 30000,
  });

  const patients = response?.results || [];

  const handleSearch = () => {
    if (ancillaryCode.trim()) {
      setSubmittedCode(ancillaryCode.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <TestTube className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submittedCode || "—"}</p>
                <p className="text-sm text-muted-foreground">Ancillary Code</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-[#1a3d2e]/40">
                <Users className="h-6 w-6 text-[#4a9a7c]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{response?.count ?? "—"}</p>
                <p className="text-sm text-muted-foreground">Eligible Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-[#3d2e1a]/40">
                <Activity className="h-6 w-6 text-[#c4a35a]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{response?.ok ? "Ready" : "Waiting"}</p>
                <p className="text-sm text-muted-foreground">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Ancillary Test Patients
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-48">
                <TestTube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="input-ancillary-code"
                  placeholder="Ancillary code..."
                  value={ancillaryCode}
                  onChange={(e) => setAncillaryCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1 md:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="input-patient-filter"
                  placeholder="Filter patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                data-testid="button-search-ancillary"
                onClick={handleSearch}
                disabled={!ancillaryCode.trim() || isLoading}
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-24rem)]">
            <div className="space-y-2">
              {!submittedCode ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Enter an ancillary code to find eligible patients</p>
                  <p className="text-sm mt-1">Type a code like "LAB001" and click Search</p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground mt-3">Finding eligible patients...</p>
                </div>
              ) : error || !response?.ok ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Unable to load patients</p>
                  <p className="text-sm mt-1">{response?.error || "Please try again"}</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No eligible patients found</p>
                  <p className="text-sm mt-1">No patients match the criteria for {submittedCode}</p>
                </div>
              ) : (
                patients.map((patient, index) => (
                  <div
                    key={patient.patient_uuid || index}
                    data-testid={`patient-item-${patient.patient_uuid}`}
                    className="p-4 rounded-lg border bg-card hover-elevate"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-[#3d2e1a]/40">
                          <User className="h-4 w-4 text-[#c4a35a]" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {patient.last_name}, {patient.first_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {patient.mrn && <span>MRN: {patient.mrn}</span>}
                            {patient.date_of_birth && <span>DOB: {patient.date_of_birth}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {patient.eligibility_reason && (
                          <Badge variant="outline">{patient.eligibility_reason}</Badge>
                        )}
                        <Badge className="bg-[#1a3d2e]/60 text-[#4a9a7c] border-[#2d5a47]/50">
                          Eligible
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
