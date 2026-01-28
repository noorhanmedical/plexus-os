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
  Shield, ArrowLeft, UserPlus, Clock, Users, ClipboardList,
  Save, Edit2
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Patient } from "@shared/schema";
import { UltrasoundProbeIcon, PgxSwabIcon, serviceConfig } from "@/components/service-icons";

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

// Ancillary services matching the dashboard - using serviceConfig colors
const ANCILLARY_SERVICES = [
  { 
    code: "BRAINWAVE", 
    name: serviceConfig.brainwave.name, 
    icon: <Brain className="h-8 w-8" strokeWidth={2.5} />, 
    color: serviceConfig.brainwave.textColor,
    bgColor: serviceConfig.brainwave.gradient 
  },
  { 
    code: "VITALWAVE", 
    name: serviceConfig.vitalwave.name, 
    icon: <Heart className="h-8 w-8" strokeWidth={2.5} />, 
    color: serviceConfig.vitalwave.textColor,
    bgColor: serviceConfig.vitalwave.gradient 
  },
  { 
    code: "ULTRASOUND", 
    name: serviceConfig.ultrasound.name, 
    icon: <UltrasoundProbeIcon className="h-8 w-8" />, 
    color: serviceConfig.ultrasound.textColor,
    bgColor: serviceConfig.ultrasound.gradient 
  },
  { 
    code: "PGX", 
    name: serviceConfig.pgx.name, 
    icon: <PgxSwabIcon className="h-8 w-8" />, 
    color: serviceConfig.pgx.textColor,
    bgColor: serviceConfig.pgx.gradient 
  },
];

type MobileView = "dashboard" | "search" | "profile";

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
  const [mobileView, setMobileView] = useState<MobileView>("dashboard");
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [medications, setMedications] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditingMedHistory, setIsEditingMedHistory] = useState(false);
  const [isEditingMeds, setIsEditingMeds] = useState(false);

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

  const handlePatientSelect = async (patient: Patient) => {
    setSelectedPatient(patient);
    setAiSuggestions([]);
    setMobileView("profile");
    setIsEditingMedHistory(false);
    setIsEditingMeds(false);
    
    setRecentPatients(prev => {
      const filtered = prev.filter(p => p.patient_uuid !== patient.patient_uuid);
      return [patient, ...filtered].slice(0, 5);
    });
    
    try {
      const response = await fetch(`/api/local/patient-profile/${patient.patient_uuid}`);
      const data = await response.json();
      if (data.ok && data.data) {
        setMedicalHistory(data.data.medical_history || "");
        setMedications(data.data.medications || "");
        setPatientNotes(data.data.patient_notes || "");
      } else {
        setMedicalHistory("");
        setMedications("");
        setPatientNotes("");
      }
    } catch (error) {
      setMedicalHistory("");
      setMedications("");
      setPatientNotes("");
    }
  };
  
  const handleSaveProfile = async () => {
    if (!selectedPatient) return;
    
    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/local/patient-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_uuid: selectedPatient.patient_uuid,
          medical_history: medicalHistory,
          medications: medications,
          patient_notes: patientNotes,
          payor_type: selectedPatient.payor_type as "Medicare" | "PPO" | undefined,
        }),
      });
      
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Profile Saved",
          description: "Patient profile updated successfully",
        });
        setIsEditingMedHistory(false);
        setIsEditingMeds(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save patient profile",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!selectedPatient) return;
    
    setAiAnalyzing(true);
    
    try {
      const response = await fetch("/api/ai/analyze-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_uuid: selectedPatient.patient_uuid,
          patientData: {
            first_name: selectedPatient.first_name,
            last_name: selectedPatient.last_name,
            date_of_birth: selectedPatient.date_of_birth,
            payor_type: selectedPatient.payor_type,
            payor_name: selectedPatient.payor_name,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.ok && data.data?.recommendations) {
        const suggestions: AncillarySuggestion[] = data.data.recommendations.map((rec: any) => {
          const iconMap: Record<string, React.ReactNode> = {
            "Neuro": <Brain className="h-5 w-5" />,
            "Cardio/Autonomic": <Heart className="h-5 w-5" />,
            "Lab": <Pill className="h-5 w-5" />,
            "Procedure": <Activity className="h-5 w-5" />,
            "Ultrasound": <Activity className="h-5 w-5" />,
          };
          
          return {
            code: rec.ancillary_code,
            name: rec.ancillary_name,
            icon: iconMap[rec.category] || <Activity className="h-5 w-5" />,
            recommended: rec.qualification_score >= 70,
            reasoning: rec.qualification_reasoning || rec.clinical_indications?.join("; ") || "Clinically indicated",
            eligibilityStatus: rec.cooldown_status === "eligible" ? "eligible" as const :
                             rec.cooldown_status === "in_cooldown" ? "pending" as const : "ineligible" as const,
          };
        });
        
        setAiSuggestions(suggestions);
        
        if (data.data.overall_summary) {
          toast({
            title: "AI Analysis Complete",
            description: `Found ${suggestions.filter(s => s.recommended).length} recommended services`,
          });
        }
      } else {
        toast({
          title: "Analysis Issue",
          description: data.error || "Could not complete AI analysis",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Could not connect to AI service",
        variant: "destructive",
      });
    } finally {
      setAiAnalyzing(false);
    }
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

  const glassStyle = "bg-gradient-to-br from-slate-800/90 via-slate-850/85 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 shadow-xl";
  const darkGlassStyle = "bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.3)]";

  const isOrderingCode = createPrescreenMutation.isPending ? createPrescreenMutation.variables?.ancillaryCode : null;

  // Mobile: navigation handlers
  const handleMobileBack = () => {
    if (mobileView === "profile") {
      setSelectedPatient(null);
      setAiSuggestions([]);
      setMobileView("dashboard");
    } else if (mobileView === "search") {
      setMobileView("dashboard");
    }
  };

  const handleMobileSearch = () => {
    setMobileView("search");
  };

  return (
    <div className="flex h-full md:gap-4">
      {/* Mobile Dashboard View - shows on mobile when not searching or viewing profile */}
      <div className={`
        ${mobileView === "dashboard" ? 'flex md:hidden' : 'hidden'} 
        w-full flex-col
        bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
        overflow-auto
      `}>
        {/* Dashboard Header */}
        <div className="p-4 border-b border-slate-700/50">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-400" />
            Patient Records
          </h1>
          <p className="text-sm text-slate-400 mt-1">Clinical EMR Dashboard</p>
        </div>

        {/* Quick Stats */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-teal-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Recent</span>
            </div>
            <p className="text-2xl font-bold text-white">{recentPatients.length}</p>
            <p className="text-xs text-slate-500">patients viewed</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-violet-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Today</span>
            </div>
            <p className="text-2xl font-bold text-white">--</p>
            <p className="text-xs text-slate-500">pending orders</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 space-y-3">
          <Button
            onClick={handleMobileSearch}
            size="lg"
            className="w-full bg-teal-600 text-white rounded-xl flex items-center justify-center gap-3"
            data-testid="button-mobile-search-patient"
          >
            <Search className="h-5 w-5" />
            <span className="font-semibold">Search Patients</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full border-slate-600 text-slate-300 rounded-xl flex items-center justify-center gap-3"
            data-testid="button-mobile-add-patient"
          >
            <UserPlus className="h-5 w-5" />
            <span>Add New Patient</span>
          </Button>
        </div>

        {/* Recent Patients Section */}
        {recentPatients.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Patients
            </h3>
            <div className="space-y-2">
              {recentPatients.map((patient) => (
                <button
                  key={patient.patient_uuid}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover-elevate active-elevate-2"
                  data-testid={`recent-patient-${patient.patient_uuid}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">
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
          </div>
        )}

        {/* Quick Actions - Ancillary Services */}
        <div className="mt-6 px-4 pb-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Ancillary Services
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {ANCILLARY_SERVICES.map((service) => (
              <div
                key={service.code}
                className={`flex flex-col items-center p-3 rounded-xl bg-gradient-to-br ${service.bgColor} border border-slate-700/30`}
              >
                <div className={service.color}>{service.icon}</div>
                <span className="text-xs text-white mt-1 text-center font-medium">{service.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Search View - shows on mobile when in search mode */}
      <div className={`
        ${mobileView === "search" ? 'flex md:hidden' : 'hidden'} 
        w-full flex-col
        bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
        overflow-hidden
      `}>
        {/* Search Header with back button */}
        <div className="p-3 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMobileBack}
              className="text-white p-1"
              data-testid="button-search-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-white font-semibold text-lg">Search Patients</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              data-testid="input-patient-database-search"
              placeholder="Search by name, MRN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-teal-500/50"
              autoFocus
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
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
                <Search className="h-12 w-12 mx-auto text-slate-500 mb-3" />
                <p className="text-sm text-slate-400">Type to search patients</p>
              </div>
            )}

            {patients.map((patient) => (
              <button
                key={patient.patient_uuid}
                data-testid={`patient-search-item-${patient.patient_uuid}`}
                onClick={() => handlePatientSelect(patient)}
                className="w-full text-left p-3 rounded-lg hover-elevate active-elevate-2 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">
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

      {/* Desktop Left Panel - Patient Search List (always visible on desktop) */}
      <div className={`
        hidden md:flex
        w-[280px] flex-shrink-0 
        rounded-2xl overflow-hidden flex-col
        bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
        backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.3)]
      `}>
        {/* Search Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-5 w-5 text-teal-400" />
            <h2 className="text-white font-semibold text-lg">Patient Search</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, MRN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-9 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-teal-500/50"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
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
                <User className="h-12 w-12 mx-auto text-slate-500 mb-3" />
                <p className="text-sm text-slate-400">Type to search patients</p>
              </div>
            )}

            {patients.map((patient) => (
              <button
                key={patient.patient_uuid}
                data-testid={`patient-db-item-${patient.patient_uuid}`}
                onClick={() => handlePatientSelect(patient)}
                className={`w-full text-left p-3 rounded-xl ${
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
      {/* On mobile: shows when mobileView is "profile". On desktop: always visible */}
      <div className={`
        ${mobileView === "profile" ? 'flex' : 'hidden'} md:flex
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
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</h3>
                    <div className="space-y-1.5 text-sm">
                      {selectedPatient.primary_phone && (
                        <p className="flex items-center gap-2 text-slate-300">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {selectedPatient.primary_phone}
                        </p>
                      )}
                      {selectedPatient.email && (
                        <p className="flex items-center gap-2 text-slate-300 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {selectedPatient.email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Address</h3>
                    <div className="text-sm text-slate-300">
                      {selectedPatient.address_line_1 && <p>{selectedPatient.address_line_1}</p>}
                      {(selectedPatient.city || selectedPatient.state) && (
                        <p>{selectedPatient.city}{selectedPatient.city && selectedPatient.state && ", "}{selectedPatient.state} {selectedPatient.zip_code}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Insurance</h3>
                    <div className="text-sm text-slate-300">
                      {selectedPatient.payor_name && <p className="font-medium">{selectedPatient.payor_name}</p>}
                      {selectedPatient.payor_type && <p className="text-slate-400">{selectedPatient.payor_type}</p>}
                      {selectedPatient.policy_id_member_id && (
                        <p className="text-xs text-slate-500">ID: {selectedPatient.policy_id_member_id}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical History Section - Editable */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={`${glassStyle} rounded-none md:rounded-2xl`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-violet-400" />
                        Past Medical History
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingMedHistory(!isEditingMedHistory)}
                        data-testid="button-edit-medical-history"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditingMedHistory ? (
                      <Textarea
                        value={medicalHistory}
                        onChange={(e) => setMedicalHistory(e.target.value)}
                        placeholder="Enter medical history (diagnoses, conditions, etc.)..."
                        className="min-h-[120px] bg-slate-800/50 border-slate-600/50 text-sm text-white placeholder:text-slate-500"
                        data-testid="textarea-medical-history"
                      />
                    ) : (
                      <div className="min-h-[100px] p-3 rounded-xl bg-slate-700/50 text-sm text-slate-300 whitespace-pre-wrap">
                        {medicalHistory || (
                          <span className="text-slate-500 italic">Click edit to add medical history</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className={`${glassStyle} rounded-none md:rounded-2xl`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-emerald-400" />
                        Current Medications
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingMeds(!isEditingMeds)}
                        data-testid="button-edit-medications"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditingMeds ? (
                      <Textarea
                        value={medications}
                        onChange={(e) => setMedications(e.target.value)}
                        placeholder="Enter current medications..."
                        className="min-h-[120px] bg-slate-800/50 border-slate-600/50 text-sm text-white placeholder:text-slate-500"
                        data-testid="textarea-medications"
                      />
                    ) : (
                      <div className="min-h-[100px] p-3 rounded-xl bg-slate-700/50 text-sm text-slate-300 whitespace-pre-wrap">
                        {medications || (
                          <span className="text-slate-500 italic">Click edit to add medications</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Save Button - Shows when editing */}
              {(isEditingMedHistory || isEditingMeds) && (
                <div className="flex justify-end px-4 md:px-0">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    data-testid="button-save-profile"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* AI Suggestions Section */}
              <div className={`rounded-none md:rounded-2xl overflow-hidden ${glassStyle}`}>
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">AI Ancillary Recommendations</h3>
                      <p className="text-xs text-slate-400">Based on PMH, medications, and eligibility rules</p>
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
                              ? "bg-emerald-500/20 border-emerald-500/30" 
                              : "bg-slate-700/50 border-slate-600/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                suggestion.recommended 
                                  ? "bg-emerald-500/30 text-emerald-400" 
                                  : "bg-slate-600/50 text-slate-400"
                              }`}>
                                {suggestion.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-white">{suggestion.name}</h4>
                                  {suggestion.recommended && (
                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Recommended
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-300">{suggestion.reasoning}</p>
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
                <div className="p-4 border-b border-slate-700/50">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Plus className="h-5 w-5 text-teal-400" />
                    Quick Order
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Order any ancillary service directly</p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {ANCILLARY_SERVICES.map((service) => (
                    <button
                      key={service.code}
                      onClick={() => handleOrderAncillary(service.code)}
                      disabled={isOrderingCode === service.code}
                      data-testid={`quick-order-${service.code}`}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600/50 transition-colors group"
                    >
                      <div className={`p-3 rounded-xl bg-slate-800 shadow-lg ${service.color}`}>
                        {isOrderingCode === service.code ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          service.icon
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-300 text-center">{service.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Notes */}
              {selectedPatient.notes && (
                <Card className={`${glassStyle} rounded-none md:rounded-2xl`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
                      <FileText className="h-4 w-4 text-amber-400" />
                      Patient Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300 p-3 rounded-xl bg-slate-700/50">
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
              <div className="h-20 w-20 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto">
                <User className="h-10 w-10 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-300">Select a Patient</h3>
                <p className="text-sm text-slate-500 mt-1">Search and select a patient from the left panel to view their profile</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
