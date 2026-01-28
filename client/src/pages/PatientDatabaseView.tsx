import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, User, Loader2, Phone, Mail, Calendar, 
  Heart, Brain, Sparkles, Pill, FileText,
  Plus, Activity, Stethoscope, CheckCircle2,
  Shield, ArrowLeft
} from "lucide-react";
import type { Patient } from "@shared/schema";
import { UltrasoundProbeIcon } from "@/components/service-icons";

type MainTab = "home" | "prescreens" | "ancillary" | "finance" | "schedule" | "billing" | "patients";

interface PatientDatabaseViewProps {
  onNavigate?: (tab: MainTab, serviceFilter?: string) => void;
}

interface AncillarySuggestion {
  code: string;
  name: string;
  icon: React.ReactNode;
  recommended: boolean;
  reasoning: string;
  eligibilityStatus: "eligible" | "pending" | "ineligible";
}

interface PatientSearchResponse {
  ok: boolean;
  data?: Patient[];
  error?: string;
}

const ANCILLARY_SERVICES = [
  { code: "AWV", name: "Annual Wellness Visit", icon: <Heart className="h-6 w-6" />, color: "text-rose-500" },
  { code: "BRAINWAVE", name: "BrainWave EEG", icon: <Brain className="h-6 w-6" />, color: "text-violet-500" },
  { code: "ABI", name: "ABI Vascular", icon: <Activity className="h-6 w-6" />, color: "text-blue-500" },
  { code: "CCM", name: "Chronic Care Mgmt", icon: <Stethoscope className="h-6 w-6" />, color: "text-emerald-500" },
  { code: "ECHO", name: "Echocardiogram", icon: <UltrasoundProbeIcon className="h-6 w-6" />, color: "text-cyan-500" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

export function PatientDatabaseView({ onNavigate }: PatientDatabaseViewProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AncillarySuggestion[]>([]);

  const { data: searchResults, isLoading, isError } = useQuery<PatientSearchResponse>({
    queryKey: [`/api/patients/search?query=${encodeURIComponent(debouncedQuery)}&limit=30`],
    enabled: debouncedQuery.trim().length > 0,
  });

  const patients = searchResults?.data || [];

  const createPrescreenMutation = useMutation({
    mutationFn: async ({ patientUuid, ancillaryCode }: { patientUuid: string; ancillaryCode: string }) => {
      const response = await apiRequest("POST", "/api/prescreens", {
        patient_uuid: patientUuid,
        requested_ancillary_code: ancillaryCode,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.ok) {
        toast({
          title: "Order Created",
          description: `${variables.ancillaryCode} order placed successfully`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/prescreens?limit=200"] });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/list?limit=100&cursor=0"] });
      } else {
        toast({
          title: "Order Failed",
          description: data.error || "Could not create order",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Network Error",
        description: "Could not connect to server",
        variant: "destructive",
      });
    },
  });

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setAiSuggestions([]);
  };

  const handleAnalyzeWithAI = async () => {
    if (!selectedPatient) return;
    
    setAiAnalyzing(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockSuggestions: AncillarySuggestion[] = [
      {
        code: "AWV",
        name: "Annual Wellness Visit",
        icon: <Heart className="h-5 w-5" />,
        recommended: true,
        reasoning: "Patient is due for annual wellness screening. Last AWV was over 12 months ago.",
        eligibilityStatus: "eligible"
      },
      {
        code: "BRAINWAVE",
        name: "BrainWave EEG",
        icon: <Brain className="h-5 w-5" />,
        recommended: true,
        reasoning: "Patient has documented cognitive concerns and is on medications that may benefit from EEG monitoring.",
        eligibilityStatus: "eligible"
      },
      {
        code: "ABI",
        name: "ABI Vascular Screen",
        icon: <Activity className="h-5 w-5" />,
        recommended: true,
        reasoning: "Hypertension and diabetes present - recommend peripheral vascular screening.",
        eligibilityStatus: "eligible"
      },
      {
        code: "CCM",
        name: "Chronic Care Management",
        icon: <Stethoscope className="h-5 w-5" />,
        recommended: false,
        reasoning: "Patient has 2+ chronic conditions but may not meet time requirements.",
        eligibilityStatus: "pending"
      },
    ];
    
    setAiSuggestions(mockSuggestions);
    setAiAnalyzing(false);
  };

  const handleOrderAncillary = (code: string) => {
    if (!selectedPatient) return;
    createPrescreenMutation.mutate({
      patientUuid: selectedPatient.patient_uuid,
      ancillaryCode: code,
    });
  };

  const calculateAge = (dob: string | undefined) => {
    if (!dob) return null;
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  const glassStyle = "bg-gradient-to-br from-white/95 via-white/90 to-slate-50/95 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]";
  const darkGlassStyle = "bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.3)]";

  const isOrderingCode = createPrescreenMutation.isPending ? createPrescreenMutation.variables?.ancillaryCode : null;

  // Mobile: clear patient selection to go back to list
  const handleMobileBack = () => {
    setSelectedPatient(null);
    setAiSuggestions([]);
  };

  return (
    <div className="flex h-full md:gap-4">
      {/* Left Panel - Patient Search List */}
      {/* On mobile: edge-to-edge, full screen. On desktop: 280px floating panel */}
      <div className={`
        ${selectedPatient ? 'hidden md:flex' : 'flex'} 
        w-full md:w-[280px] flex-shrink-0 
        md:rounded-2xl overflow-hidden flex-col
        bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
        md:backdrop-blur-xl md:border md:border-slate-700/50 md:shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        transition-all duration-300
      `}>
        {/* Search Header - compact on mobile */}
        <div className="p-3 md:p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <User className="h-4 w-4 md:h-5 md:w-5 text-teal-400" />
            <h2 className="text-white font-semibold text-base md:text-lg">
              Patient Search
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              data-testid="input-patient-database-search"
              placeholder="Search by name, MRN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11 md:h-9 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-teal-500/50"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 md:p-2 space-y-0.5 md:space-y-1">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
              </div>
            )}

            {isError && (
              <div className="p-4 text-sm text-rose-400 text-center">
                Failed to search patients
              </div>
            )}

            {!isLoading && !isError && patients.length === 0 && debouncedQuery && (
              <div className="p-4 text-sm text-slate-400 text-center">
                No patients found
              </div>
            )}

            {!isLoading && !isError && patients.length === 0 && !debouncedQuery && (
              <div className="p-6 text-center">
                <User className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">Type to search patients</p>
              </div>
            )}

            {patients.map((patient) => (
              <button
                key={patient.patient_uuid}
                data-testid={`patient-db-item-${patient.patient_uuid}`}
                onClick={() => handlePatientSelect(patient)}
                className={`w-full text-left p-3 md:p-3 rounded-lg md:rounded-xl ${
                  selectedPatient?.patient_uuid === patient.patient_uuid
                    ? "bg-teal-500/20 border border-teal-500/40"
                    : "hover-elevate active-elevate-2 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedPatient?.patient_uuid === patient.patient_uuid
                      ? "bg-teal-500/30"
                      : "bg-slate-700/50"
                  }`}>
                    <User className={`h-5 w-5 ${
                      selectedPatient?.patient_uuid === patient.patient_uuid
                        ? "text-teal-400"
                        : "text-slate-400"
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate" data-testid={`patient-name-${patient.patient_uuid}`}>
                      {patient.last_name}, {patient.first_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {patient.mrn && <span>MRN: {patient.mrn}</span>}
                      {patient.date_of_birth && (
                        <span>• {calculateAge(patient.date_of_birth)}yo</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Patient Profile */}
      {/* On mobile: edge-to-edge, full screen. On desktop: floating panel */}
      <div className={`
        ${selectedPatient ? 'flex' : 'hidden md:flex'} 
        flex-1 overflow-hidden flex-col
        transition-all duration-300
      `}>
        {selectedPatient ? (
          <ScrollArea className="h-full">
            <div className="space-y-3 md:space-y-4 md:pr-2">
              {/* Mobile Back Button - sticky header on mobile */}
              <div className="md:hidden sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-3 py-2 border-b border-slate-700/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMobileBack}
                  data-testid="button-mobile-back"
                  className="text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Search
                </Button>
              </div>

              {/* Demographics Header */}
              <div className={`md:rounded-2xl overflow-hidden ${glassStyle}`}>
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="h-14 w-14 md:h-20 md:w-20 rounded-2xl bg-gradient-to-br from-teal-500/30 to-teal-600/20 flex items-center justify-center border border-teal-500/30 flex-shrink-0">
                      <User className="h-7 w-7 md:h-10 md:w-10 text-teal-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-white" data-testid="text-patient-fullname">
                          {selectedPatient.last_name}, {selectedPatient.first_name}
                          {selectedPatient.middle_name && ` ${selectedPatient.middle_name.charAt(0)}.`}
                        </h1>
                        {selectedPatient.record_status && (
                          <Badge className={`${
                            selectedPatient.record_status.toLowerCase() === "active"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-slate-700/50 text-slate-400 border-slate-600"
                          }`}>
                            {selectedPatient.record_status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                        {selectedPatient.mrn && (
                          <span className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-slate-400" />
                            MRN: {selectedPatient.mrn}
                          </span>
                        )}
                        {selectedPatient.date_of_birth && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {selectedPatient.date_of_birth} ({calculateAge(selectedPatient.date_of_birth)}yo)
                          </span>
                        )}
                        {selectedPatient.sex_assigned_at_birth && (
                          <span>{selectedPatient.sex_assigned_at_birth}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Contact & Insurance Grid */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</h3>
                    <div className="space-y-1.5 text-sm">
                      {selectedPatient.primary_phone && (
                        <p className="flex items-center gap-2 text-slate-700">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {selectedPatient.primary_phone}
                        </p>
                      )}
                      {selectedPatient.email && (
                        <p className="flex items-center gap-2 text-slate-700 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {selectedPatient.email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Address</h3>
                    <div className="text-sm text-slate-700">
                      {selectedPatient.address_line_1 && <p>{selectedPatient.address_line_1}</p>}
                      {(selectedPatient.city || selectedPatient.state) && (
                        <p>{selectedPatient.city}{selectedPatient.city && selectedPatient.state && ", "}{selectedPatient.state} {selectedPatient.zip_code}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Insurance</h3>
                    <div className="text-sm text-slate-700">
                      {selectedPatient.payor_name && <p className="font-medium">{selectedPatient.payor_name}</p>}
                      {selectedPatient.payor_type && <p className="text-slate-500">{selectedPatient.payor_type}</p>}
                      {selectedPatient.policy_id_member_id && (
                        <p className="text-xs text-slate-400">ID: {selectedPatient.policy_id_member_id}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical History Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={`${glassStyle} rounded-none md:rounded-2xl`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                      <FileText className="h-4 w-4 text-violet-500" />
                      Past Medical History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[100px] p-3 rounded-xl bg-slate-100/80 text-sm text-slate-600 space-y-1">
                      <p>• Hypertension (I10)</p>
                      <p>• Type 2 Diabetes Mellitus (E11.9)</p>
                      <p>• Hyperlipidemia (E78.5)</p>
                      <p>• Obesity (E66.9)</p>
                      <p className="text-slate-400 italic text-xs mt-2">Data from pulled_pmh_snapshot</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${glassStyle} rounded-none md:rounded-2xl`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                      <Pill className="h-4 w-4 text-emerald-500" />
                      Current Medications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[100px] p-3 rounded-xl bg-slate-100/80 text-sm text-slate-600 space-y-1">
                      <p>• Lisinopril 10mg QD</p>
                      <p>• Metformin 500mg BID</p>
                      <p>• Atorvastatin 20mg QHS</p>
                      <p>• Aspirin 81mg QD</p>
                      <p className="text-slate-400 italic text-xs mt-2">Data from pulled_meds_snapshot</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Suggestions Section */}
              <div className={`rounded-none md:rounded-2xl overflow-hidden ${glassStyle}`}>
                <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">AI Ancillary Recommendations</h3>
                      <p className="text-xs text-slate-500">Based on PMH, medications, and eligibility rules</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleAnalyzeWithAI}
                    disabled={aiAnalyzing}
                    data-testid="button-analyze-ai"
                  >
                    {aiAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Analyze Patient
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="p-4">
                  {aiSuggestions.length === 0 && !aiAnalyzing ? (
                    <div className="text-center py-8 text-slate-400">
                      <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Click "Analyze Patient" to get AI-powered ancillary recommendations</p>
                    </div>
                  ) : aiAnalyzing ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-violet-500" />
                      <p className="text-sm text-slate-500">Analyzing patient history and eligibility...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiSuggestions.map((suggestion) => (
                        <div 
                          key={suggestion.code}
                          data-testid={`ai-suggestion-${suggestion.code}`}
                          className={`p-4 rounded-xl border ${
                            suggestion.recommended 
                              ? "bg-emerald-50/80 border-emerald-200/80" 
                              : "bg-slate-50/80 border-slate-200/80"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                suggestion.recommended 
                                  ? "bg-emerald-100 text-emerald-600" 
                                  : "bg-slate-100 text-slate-500"
                              }`}>
                                {suggestion.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-slate-800">{suggestion.name}</h4>
                                  {suggestion.recommended && (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Recommended
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600">{suggestion.reasoning}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleOrderAncillary(suggestion.code)}
                              disabled={isOrderingCode === suggestion.code}
                              variant={suggestion.recommended ? "default" : "secondary"}
                              data-testid={`button-order-${suggestion.code}`}
                            >
                              {isOrderingCode === suggestion.code ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Order
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Order Section */}
              <div className={`rounded-none md:rounded-2xl overflow-hidden ${glassStyle}`}>
                <div className="p-4 border-b border-slate-200/80">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-teal-600" />
                    Quick Order
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Order any ancillary service directly</p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {ANCILLARY_SERVICES.map((service) => (
                    <button
                      key={service.code}
                      onClick={() => handleOrderAncillary(service.code)}
                      disabled={isOrderingCode === service.code}
                      data-testid={`quick-order-${service.code}`}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover-elevate active-elevate-2 group"
                    >
                      <div className={`p-3 rounded-xl bg-white shadow-sm ${service.color}`}>
                        {isOrderingCode === service.code ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          service.icon
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-700 text-center">{service.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Notes */}
              {selectedPatient.notes && (
                <Card className={`${glassStyle} rounded-none md:rounded-2xl`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                      <FileText className="h-4 w-4 text-amber-500" />
                      Patient Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 p-3 rounded-xl bg-slate-100/80">
                      {selectedPatient.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className={`h-full rounded-2xl flex flex-col items-center justify-center ${glassStyle}`}>
            <div className="text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <User className="h-10 w-10 text-slate-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-700">Select a Patient</h3>
                <p className="text-sm text-slate-500 mt-1">Search and select a patient from the left panel to view their profile</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
