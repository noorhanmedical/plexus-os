import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  Brain,
  Heart,
  Stethoscope,
  Syringe,
  Dna,
  FileText,
  Send,
  User,
  Calendar,
  Building2,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ANCILLARY_CATALOG, AncillaryService, ANCILLARY_CATEGORIES } from "@shared/ancillaryCatalog";

interface AncillaryOrderingProps {
  onBack?: () => void;
}

interface Patient {
  patient_uuid: string;
  patient_name?: string;
  name?: string;
  dob?: string;
  mrn?: string;
  sex?: string;
  insurance?: string;
}

const CLINICIANS = [
  "Dr. Ali Imran",
  "Dr. Sarah Chen",
  "Dr. Michael Roberts",
  "Dr. Emily Watson",
  "Dr. James Park",
];

const SERVICE_CATEGORIES = [
  { id: "brainwave", name: "BrainWave", icon: Brain, color: "violet" },
  { id: "vitalwave", name: "VitalWave", icon: Heart, color: "rose" },
  { id: "ultrasound", name: "Ultrasounds", icon: Stethoscope, color: "cyan" },
  { id: "steroid", name: "Steroid Injection", icon: Syringe, color: "amber" },
  { id: "pgx", name: "PGx", icon: Dna, color: "emerald" },
];

function getCategoryIcon(category: string) {
  switch (category) {
    case "Neuro":
      return Brain;
    case "Cardio/Autonomic":
      return Heart;
    case "Ultrasound":
      return Stethoscope;
    case "Procedure":
      return Syringe;
    case "Lab":
      return Dna;
    default:
      return FileText;
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case "Neuro":
      return "violet";
    case "Cardio/Autonomic":
      return "rose";
    case "Ultrasound":
      return "cyan";
    case "Procedure":
      return "amber";
    case "Lab":
      return "emerald";
    default:
      return "slate";
  }
}

export function AncillaryOrdering({ onBack }: AncillaryOrderingProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"select" | "details" | "documents" | "confirm">("select");
  const [clinician, setClinician] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [dateOfService, setDateOfService] = useState(new Date().toISOString().split("T")[0]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  
  const [preProcedureNote, setPreProcedureNote] = useState("");
  const [postProcedureNote, setPostProcedureNote] = useState("");
  const [billingNotes, setBillingNotes] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = useQuery<{ ok: boolean; data: Patient[] }>({
    queryKey: ["/api/patients/search", patientSearch],
    queryFn: async () => {
      if (!patientSearch || patientSearch.length < 2) return { ok: true, data: [] };
      const res = await fetch(`/api/patients/search?query=${encodeURIComponent(patientSearch)}&limit=50`);
      return res.json();
    },
    enabled: patientSearch.length >= 2,
  });

  const submitOrderMutation = useMutation({
    mutationFn: async (payload: {
      clinician: string;
      patient_uuid: string;
      patient_name: string;
      date_of_service: string;
      services: string[];
      pre_procedure_note: string;
      post_procedure_note: string;
      billing_notes: string;
    }) => {
      const res = await apiRequest("POST", "/api/billing/add-order", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({ title: "Order Submitted", description: "Order has been added to the billing spreadsheet" });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/list?limit=5000&cursor=0"] });
        setStep("confirm");
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit order", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit order", variant: "destructive" });
    },
  });

  const filteredServices = useMemo(() => {
    if (activeCategory === "all") return ANCILLARY_CATALOG.filter(s => s.active);
    return ANCILLARY_CATALOG.filter(s => s.active && s.category === activeCategory);
  }, [activeCategory]);

  const groupedServices = useMemo(() => {
    const groups: Record<string, AncillaryService[]> = {};
    ANCILLARY_CATEGORIES.forEach(cat => {
      groups[cat] = ANCILLARY_CATALOG.filter(s => s.category === cat && s.active);
    });
    return groups;
  }, []);

  const handleServiceToggle = (code: string) => {
    setSelectedServices(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.patient_name || patient.name || "");
    setIsPatientSearchOpen(false);
  };

  const handleSubmit = () => {
    if (!selectedPatient || !clinician || selectedServices.length === 0) {
      toast({ title: "Missing Information", description: "Please complete all required fields", variant: "destructive" });
      return;
    }

    submitOrderMutation.mutate({
      clinician,
      patient_uuid: selectedPatient.patient_uuid,
      patient_name: selectedPatient.patient_name || selectedPatient.name || "",
      date_of_service: dateOfService,
      services: selectedServices,
      pre_procedure_note: preProcedureNote,
      post_procedure_note: postProcedureNote,
      billing_notes: billingNotes,
    });
  };

  const resetForm = () => {
    setStep("select");
    setClinician("");
    setPatientSearch("");
    setSelectedPatient(null);
    setSelectedServices([]);
    setPreProcedureNote("");
    setPostProcedureNote("");
    setBillingNotes("");
    setDateOfService(new Date().toISOString().split("T")[0]);
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (step === "confirm") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90">
          <div className="flex flex-wrap items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="gap-2"
                data-testid="button-back-to-dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            )}
            <h2 className="text-lg font-semibold text-foreground">Order Confirmation</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full bg-card border-border">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Order Submitted Successfully</h3>
              <p className="text-muted-foreground mb-6">
                The order for {selectedPatient?.patient_name || selectedPatient?.name} has been added to the billing spreadsheet.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={resetForm} className="w-full" data-testid="button-new-order">
                  Create New Order
                </Button>
                {onBack && (
                  <Button variant="outline" onClick={onBack} className="w-full" data-testid="button-return-dashboard">
                    Return to Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90">
        <div className="flex flex-wrap items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          )}
          <h2 className="text-lg font-semibold text-foreground">Ancillary Service Management</h2>
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            System Active
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">{today}</div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)}>
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
              <TabsTrigger value="select" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
                1. Select Services
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                disabled={selectedServices.length === 0}
                className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300"
              >
                2. Patient Details
              </TabsTrigger>
              <TabsTrigger 
                value="documents" 
                disabled={!selectedPatient || !clinician}
                className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300"
              >
                3. Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-violet-400" />
                    Select Ancillary Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={activeCategory === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategory("all")}
                      data-testid="button-category-all"
                    >
                      All Services
                    </Button>
                    {ANCILLARY_CATEGORIES.map((cat) => {
                      const Icon = getCategoryIcon(cat);
                      const color = getCategoryColor(cat);
                      return (
                        <Button
                          key={cat}
                          variant={activeCategory === cat ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveCategory(cat)}
                          className="gap-2"
                          data-testid={`button-category-${cat.toLowerCase().replace(/\//g, "-")}`}
                        >
                          <Icon className={`h-4 w-4 text-${color}-400`} />
                          {cat}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredServices.map((service) => {
                      const Icon = getCategoryIcon(service.category);
                      const color = getCategoryColor(service.category);
                      const isSelected = selectedServices.includes(service.ancillary_code);

                      return (
                        <div
                          key={service.ancillary_code}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? `bg-${color}-500/10 border-${color}-500/50`
                              : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50"
                          }`}
                          onClick={() => handleServiceToggle(service.ancillary_code)}
                          data-testid={`service-${service.ancillary_code}`}
                        >
                          <Checkbox
                            checked={isSelected}
                            className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                          />
                          <Icon className={`h-5 w-5 text-${color}-400`} />
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{service.ancillary_name}</div>
                            {service.cpt_code && (
                              <div className="text-xs text-muted-foreground">CPT: {service.cpt_code}</div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs bg-slate-800/50">
                            {service.category}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  {selectedServices.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} selected
                      </div>
                      <Button onClick={() => setStep("details")} data-testid="button-continue-details">
                        Continue to Patient Details
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <User className="h-5 w-5 text-violet-400" />
                    Patient & Clinician Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clinician">Clinician Name *</Label>
                      <Select value={clinician} onValueChange={setClinician}>
                        <SelectTrigger id="clinician" data-testid="select-clinician">
                          <SelectValue placeholder="Select Clinician" />
                        </SelectTrigger>
                        <SelectContent>
                          {CLINICIANS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="patient">Patient Name *</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="patient"
                          placeholder="Search patients..."
                          value={patientSearch}
                          onChange={(e) => {
                            setPatientSearch(e.target.value);
                            setIsPatientSearchOpen(true);
                          }}
                          onFocus={() => setIsPatientSearchOpen(true)}
                          className="pl-10"
                          data-testid="input-patient-search"
                        />
                        {isPatientSearchOpen && patientSearch.length >= 2 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-auto">
                            {patientsLoading ? (
                              <div className="p-3 text-center text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                Searching...
                              </div>
                            ) : patientsData?.data && patientsData.data.length > 0 ? (
                              patientsData.data.map((patient) => (
                                <div
                                  key={patient.patient_uuid}
                                  className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0"
                                  onClick={() => handlePatientSelect(patient)}
                                  data-testid={`patient-option-${patient.patient_uuid}`}
                                >
                                  <div className="font-medium text-foreground">
                                    {patient.patient_name || patient.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {patient.dob && `DOB: ${patient.dob}`}
                                    {patient.mrn && ` | MRN: ${patient.mrn}`}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-muted-foreground">
                                No patients found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedPatient && (
                    <Card className="bg-slate-800/30 border-slate-700/50">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <User className="h-6 w-6 text-violet-400" />
                          </div>
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <div className="text-xs text-muted-foreground">Patient Name</div>
                              <div className="font-medium text-foreground">
                                {selectedPatient.patient_name || selectedPatient.name}
                              </div>
                            </div>
                            {selectedPatient.dob && (
                              <div>
                                <div className="text-xs text-muted-foreground">Date of Birth</div>
                                <div className="text-foreground">{selectedPatient.dob}</div>
                              </div>
                            )}
                            {selectedPatient.mrn && (
                              <div>
                                <div className="text-xs text-muted-foreground">MRN</div>
                                <div className="text-foreground">{selectedPatient.mrn}</div>
                              </div>
                            )}
                            {selectedPatient.insurance && (
                              <div>
                                <div className="text-xs text-muted-foreground">Insurance</div>
                                <div className="text-foreground">{selectedPatient.insurance}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dos">Date of Service</Label>
                    <Input
                      id="dos"
                      type="date"
                      value={dateOfService}
                      onChange={(e) => setDateOfService(e.target.value)}
                      data-testid="input-date-of-service"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setStep("select")} data-testid="button-back-services">
                      Back to Services
                    </Button>
                    <Button 
                      onClick={() => setStep("documents")} 
                      disabled={!selectedPatient || !clinician}
                      data-testid="button-continue-documents"
                    >
                      Continue to Documents
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-violet-400" />
                    Documentation & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="pre-procedure">Pre-Procedure Order Note</Label>
                    <Textarea
                      id="pre-procedure"
                      placeholder="Enter pre-procedure notes, clinical indications, and order justification..."
                      value={preProcedureNote}
                      onChange={(e) => setPreProcedureNote(e.target.value)}
                      rows={4}
                      data-testid="textarea-pre-procedure"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="post-procedure">Post-Procedure Note</Label>
                    <Textarea
                      id="post-procedure"
                      placeholder="Enter post-procedure findings and notes..."
                      value={postProcedureNote}
                      onChange={(e) => setPostProcedureNote(e.target.value)}
                      rows={4}
                      data-testid="textarea-post-procedure"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billing-notes">Billing Notes</Label>
                    <Textarea
                      id="billing-notes"
                      placeholder="Additional notes for billing department..."
                      value={billingNotes}
                      onChange={(e) => setBillingNotes(e.target.value)}
                      rows={3}
                      data-testid="textarea-billing-notes"
                    />
                  </div>

                  <Card className="bg-slate-800/30 border-slate-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clinician:</span>
                        <span className="text-foreground">{clinician}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Patient:</span>
                        <span className="text-foreground">{selectedPatient?.patient_name || selectedPatient?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date of Service:</span>
                        <span className="text-foreground">{dateOfService}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-700/50">
                        <span className="text-muted-foreground text-sm">Services:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedServices.map((code) => {
                            const service = ANCILLARY_CATALOG.find(s => s.ancillary_code === code);
                            return (
                              <Badge key={code} variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/30">
                                {service?.ancillary_name || code}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setStep("details")} data-testid="button-back-details">
                      Back to Details
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={submitOrderMutation.isPending}
                      className="gap-2"
                      data-testid="button-submit-order"
                    >
                      {submitOrderMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Order to Billing
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
