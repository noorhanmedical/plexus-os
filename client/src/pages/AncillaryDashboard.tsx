import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Search, Loader2, User, Users, TestTube, Calendar, CheckCircle, Edit, RefreshCw } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CatalogItem {
  ancillary_code: string;
  ancillary_name?: string;
  repeat_policy?: string;
}

interface CatalogResponse {
  ok: boolean;
  data?: CatalogItem[];
  error?: string;
}

interface EligiblePatient {
  patient_uuid: string;
  first_name: string;
  last_name: string;
  mrn?: string;
  date_of_birth?: string;
  eligibility_reason?: string;
  status?: string;
  scheduled_date?: string;
  notes?: string;
}

interface AncillaryPatientsResponse {
  ok: boolean;
  action?: string;
  ancillary_code?: string;
  count?: number;
  results?: EligiblePatient[];
  error?: string;
}

interface UpdatePayload {
  patient_uuid: string;
  ancillary_code: string;
  status?: string;
  scheduled_date?: string;
  notes?: string;
  completed_date?: string;
}

export function AncillaryDashboard() {
  const [selectedCode, setSelectedCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editPatient, setEditPatient] = useState<EligiblePatient | null>(null);
  const [editForm, setEditForm] = useState({
    status: "",
    scheduled_date: "",
    notes: "",
  });
  const { toast } = useToast();

  const { data: catalogResponse, isLoading: catalogLoading } = useQuery<CatalogResponse>({
    queryKey: ["/api/ancillary/catalog"],
  });

  const catalogItems = catalogResponse?.data || [];

  const { data: response, isLoading, isFetching, refetch } = useQuery<AncillaryPatientsResponse>({
    queryKey: [`/api/ancillary/patients?ancillary_code=${selectedCode}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}&limit=50`],
    enabled: selectedCode.length > 0,
  });

  const patients = response?.results || [];

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdatePayload) => {
      return apiRequest("POST", "/api/ancillary/update", payload);
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Patient record updated successfully" });
      refetch();
      setEditPatient(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update record", variant: "destructive" });
    },
  });

  const openEditDialog = (patient: EligiblePatient) => {
    setEditPatient(patient);
    setEditForm({
      status: patient.status || "",
      scheduled_date: patient.scheduled_date || "",
      notes: patient.notes || "",
    });
  };

  const handleSave = () => {
    if (!editPatient || !selectedCode) return;
    updateMutation.mutate({
      patient_uuid: editPatient.patient_uuid,
      ancillary_code: selectedCode,
      status: editForm.status || undefined,
      scheduled_date: editForm.scheduled_date || undefined,
      notes: editForm.notes || undefined,
    });
  };

  const handleMarkCompleted = (patient: EligiblePatient) => {
    if (!selectedCode) return;
    const today = new Date().toISOString().split("T")[0];
    updateMutation.mutate({
      patient_uuid: patient.patient_uuid,
      ancillary_code: selectedCode,
      status: "completed",
      completed_date: today,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ancillary Service Tracker</h1>
          <p className="text-sm text-muted-foreground">Track patient eligibility for ancillary services</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
          className="gap-2"
          data-testid="button-refresh-ancillary"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <TestTube className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedCode || "—"}</p>
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
              <Select value={selectedCode} onValueChange={setSelectedCode}>
                <SelectTrigger data-testid="select-ancillary-code" className="w-48">
                  <SelectValue placeholder={catalogLoading ? "Loading..." : "Select code..."} />
                </SelectTrigger>
                <SelectContent>
                  {catalogItems.map((item) => (
                    <SelectItem key={item.ancillary_code} value={item.ancillary_code}>
                      {item.ancillary_code} {item.ancillary_name ? `- ${item.ancillary_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-24rem)]">
            <div className="space-y-2">
              {!selectedCode ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select an ancillary code</p>
                  <p className="text-sm mt-1">Choose from the dropdown to find eligible patients</p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground mt-3">Finding eligible patients...</p>
                </div>
              ) : !response?.ok ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Unable to load patients</p>
                  <p className="text-sm mt-1">{response?.error || "Please try again"}</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No eligible patients found</p>
                  <p className="text-sm mt-1">No patients match the criteria for {selectedCode}</p>
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
                            {patient.scheduled_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {patient.scheduled_date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {patient.status && (
                          <Badge variant={patient.status === "completed" ? "default" : "outline"}>
                            {patient.status}
                          </Badge>
                        )}
                        {patient.eligibility_reason && (
                          <Badge variant="outline">{patient.eligibility_reason}</Badge>
                        )}
                        <Badge className="bg-[#1a3d2e]/60 text-[#4a9a7c] border-[#2d5a47]/50">
                          Eligible
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-edit-${patient.patient_uuid}`}
                          onClick={() => openEditDialog(patient)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-complete-${patient.patient_uuid}`}
                          onClick={() => handleMarkCompleted(patient)}
                          disabled={updateMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!editPatient} onOpenChange={(open) => !open && setEditPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Patient: {editPatient?.last_name}, {editPatient?.first_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger id="status" data-testid="select-edit-status">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Scheduled Date</Label>
              <Input
                id="scheduled_date"
                type="date"
                data-testid="input-scheduled-date"
                value={editForm.scheduled_date}
                onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                data-testid="input-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPatient(null)}>
              Cancel
            </Button>
            <Button
              data-testid="button-save-edit"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
