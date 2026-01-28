import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Calendar, 
  RefreshCw, 
  User,
  Filter,
  ChevronRight,
  Loader2,
  Brain,
  Heart,
  Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { UltrasoundProbeIcon } from "@/components/service-icons";

interface BillingRecord {
  source_tab?: string;
  date_of_service?: string;
  patient?: string;
  patient_name?: string;
  patient_uuid?: string;
  billing_status?: string;
  paid_amount?: string | number;
  date?: string;
}

interface BillingResponse {
  ok: boolean;
  rows: BillingRecord[];
}

interface PatientEligibility {
  patient_uuid: string;
  patient_name: string;
  service_type: string;
  last_service_date: Date;
  days_since_service: number;
  cooldown_days: number;
  eligibility_status: "eligible" | "due_soon" | "overdue";
  payor_assumed: "Medicare" | "PPO";
  service_code?: string;
}

interface EligibilityTrackerProps {
  onNavigate?: (tab: string, data?: any) => void;
}

const glassStyle = "backdrop-blur-xl bg-white/90 border border-slate-200 shadow-xl";

const serviceCategories = [
  { id: "all", label: "All Services" },
  { id: "brainwave", label: "BrainWave" },
  { id: "vitalwave", label: "VitalWave" },
  { id: "ultrasound", label: "Ultrasound" },
];

const cooldownDays = {
  ppo: 180,
  medicare: 365,
};

function getServiceIcon(serviceType: string) {
  switch (serviceType.toLowerCase()) {
    case "brainwave":
      return Brain;
    case "vitalwave":
      return Heart;
    case "ultrasound":
      return UltrasoundProbeIcon;
    default:
      return Activity;
  }
}

function getEligibilityBadge(status: PatientEligibility["eligibility_status"]) {
  switch (status) {
    case "overdue":
      return { className: "bg-rose-100 text-rose-700 border-rose-200", label: "Overdue" };
    case "due_soon":
      return { className: "bg-amber-100 text-amber-700 border-amber-200", label: "Due Soon" };
    case "eligible":
      return { className: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Eligible" };
  }
}

export function EligibilityTracker({ onNavigate }: EligibilityTrackerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<PatientEligibility | null>(null);

  const { data: billingData, isLoading, refetch } = useQuery<BillingResponse>({
    queryKey: ["/api/billing/list?limit=100&cursor=0"],
  });

  const patientEligibilities = useMemo(() => {
    const records = billingData?.rows || [];
    const now = new Date();
    const patientMap = new Map<string, PatientEligibility>();

    records.forEach(r => {
      const patientName = r.patient_name || r.patient || "Unknown";
      const patientUuid = r.patient_uuid || `temp-${patientName.replace(/\s/g, "-")}`;
      const serviceDate = r.date_of_service ? new Date(r.date_of_service) : (r.date ? new Date(r.date) : null);
      
      let serviceType = "Other";
      if (r.source_tab?.includes("BRAINWAVE")) serviceType = "BrainWave";
      else if (r.source_tab?.includes("ULTRASOUND")) serviceType = "Ultrasound";
      else if (r.source_tab?.includes("VITALWAVE")) serviceType = "VitalWave";
      
      if (serviceDate && patientName !== "Unknown" && serviceType !== "Other") {
        const key = `${patientUuid}-${serviceType}`;
        const existing = patientMap.get(key);
        
        if (!existing || serviceDate > existing.last_service_date) {
          const daysSince = Math.floor((now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));
          const ppoCooldown = cooldownDays.ppo;
          const medicareCooldown = cooldownDays.medicare;
          
          const payorAssumed: "Medicare" | "PPO" = daysSince > medicareCooldown ? "Medicare" : "PPO";
          const cooldown = payorAssumed === "Medicare" ? medicareCooldown : ppoCooldown;
          
          let eligibilityStatus: PatientEligibility["eligibility_status"];
          if (daysSince >= cooldown) {
            eligibilityStatus = "eligible";
          } else if (daysSince >= cooldown - 30) {
            eligibilityStatus = "due_soon";
          } else {
            eligibilityStatus = "due_soon";
          }

          if (daysSince > cooldown + 90) {
            eligibilityStatus = "overdue";
          }

          if (daysSince >= ppoCooldown - 30) {
            patientMap.set(key, {
              patient_uuid: patientUuid,
              patient_name: patientName,
              service_type: serviceType,
              last_service_date: serviceDate,
              days_since_service: daysSince,
              cooldown_days: cooldown,
              eligibility_status: eligibilityStatus,
              payor_assumed: payorAssumed,
            });
          }
        }
      }
    });

    return Array.from(patientMap.values())
      .sort((a, b) => {
        if (a.eligibility_status === "overdue" && b.eligibility_status !== "overdue") return -1;
        if (b.eligibility_status === "overdue" && a.eligibility_status !== "overdue") return 1;
        return b.days_since_service - a.days_since_service;
      });
  }, [billingData]);

  const filteredPatients = useMemo(() => {
    return patientEligibilities.filter(p => {
      const matchesSearch = searchTerm === "" || 
        p.patient_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = serviceFilter === "all" || 
        p.service_type.toLowerCase() === serviceFilter.toLowerCase();
      const matchesStatus = statusFilter === "all" || 
        p.eligibility_status === statusFilter;
      return matchesSearch && matchesService && matchesStatus;
    });
  }, [patientEligibilities, searchTerm, serviceFilter, statusFilter]);

  const stats = useMemo(() => {
    const overdue = patientEligibilities.filter(p => p.eligibility_status === "overdue").length;
    const dueSoon = patientEligibilities.filter(p => p.eligibility_status === "due_soon").length;
    const eligible = patientEligibilities.filter(p => p.eligibility_status === "eligible").length;
    const brainwave = patientEligibilities.filter(p => p.service_type === "BrainWave").length;
    const ultrasound = patientEligibilities.filter(p => p.service_type === "Ultrasound").length;
    const vitalwave = patientEligibilities.filter(p => p.service_type === "VitalWave").length;
    return { overdue, dueSoon, eligible, brainwave, ultrasound, vitalwave, total: patientEligibilities.length };
  }, [patientEligibilities]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Eligibility Tracker</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
          data-testid="button-refresh-eligibility"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.overdue}</p>
                <p className="text-sm text-slate-500">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.dueSoon}</p>
                <p className="text-sm text-slate-500">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.eligible}</p>
                <p className="text-sm text-slate-500">Eligible</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-100">
                <Brain className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.brainwave}</p>
                <p className="text-sm text-slate-500">BrainWave</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <UltrasoundProbeIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.ultrasound}</p>
                <p className="text-sm text-slate-500">Ultrasound</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-100">
                <Heart className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.vitalwave}</p>
                <p className="text-sm text-slate-500">VitalWave</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className={`${glassStyle} rounded-2xl`}>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-violet-600" />
                  Patients Due for Re-Testing
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                      data-testid="input-search-eligibility"
                    />
                  </div>
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger className="w-[140px] h-9" data-testid="select-service-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9" data-testid="select-eligibility-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="due_soon">Due Soon</SelectItem>
                      <SelectItem value="eligible">Eligible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No patients due for testing</p>
                  <p className="text-sm">Check back later or adjust filters</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredPatients.map((patient, index) => {
                      const ServiceIcon = getServiceIcon(patient.service_type);
                      const statusBadge = getEligibilityBadge(patient.eligibility_status);
                      return (
                        <div
                          key={`${patient.patient_uuid}-${patient.service_type}-${index}`}
                          className={`p-3 rounded-xl border transition-all cursor-pointer hover:bg-slate-50 ${
                            selectedPatient?.patient_uuid === patient.patient_uuid && 
                            selectedPatient?.service_type === patient.service_type
                              ? 'bg-violet-50 border-violet-200' 
                              : 'bg-white border-slate-200'
                          }`}
                          onClick={() => setSelectedPatient(patient)}
                          data-testid={`eligibility-patient-${patient.patient_uuid}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-xl bg-slate-100 shrink-0">
                                <ServiceIcon className="h-5 w-5 text-slate-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-800 truncate">
                                  {patient.patient_name}
                                </p>
                                <p className="text-sm text-slate-600">{patient.service_type}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Last: {patient.last_service_date.toLocaleDateString()} ({patient.days_since_service} days ago)
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <Badge className={statusBadge.className}>
                                {statusBadge.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {patient.payor_assumed}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedPatient ? (
            <Card className={`${glassStyle} rounded-2xl`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-violet-600" />
                  Patient Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-bold text-slate-800">
                      {selectedPatient.patient_name}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(() => {
                        const badge = getEligibilityBadge(selectedPatient.eligibility_status);
                        return <Badge className={badge.className}>{badge.label}</Badge>;
                      })()}
                      <Badge variant="outline">{selectedPatient.payor_assumed}</Badge>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs font-medium text-slate-500 mb-2">Service Due</p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const ServiceIcon = getServiceIcon(selectedPatient.service_type);
                        return <ServiceIcon className="h-5 w-5 text-violet-600" />;
                      })()}
                      <span className="font-semibold text-slate-800">{selectedPatient.service_type}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50">
                      <p className="text-xs font-medium text-slate-500">Last Service</p>
                      <p className="font-semibold text-slate-800">
                        {selectedPatient.last_service_date.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50">
                      <p className="text-xs font-medium text-slate-500">Days Since</p>
                      <p className="font-semibold text-slate-800">
                        {selectedPatient.days_since_service} days
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
                    <p className="text-xs font-medium text-violet-700 mb-1">Cooldown Period</p>
                    <p className="text-sm text-violet-800">
                      {selectedPatient.payor_assumed === "Medicare" ? "12 months" : "6 months"} 
                      ({selectedPatient.cooldown_days} days)
                    </p>
                    <div className="mt-2 h-2 bg-violet-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          selectedPatient.eligibility_status === "overdue" 
                            ? "bg-rose-500" 
                            : selectedPatient.eligibility_status === "eligible"
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                        }`}
                        style={{ 
                          width: `${Math.min(100, (selectedPatient.days_since_service / selectedPatient.cooldown_days) * 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-violet-600 mt-1">
                      {selectedPatient.days_since_service >= selectedPatient.cooldown_days
                        ? `Eligible for ${selectedPatient.days_since_service - selectedPatient.cooldown_days} days`
                        : `${selectedPatient.cooldown_days - selectedPatient.days_since_service} days remaining`
                      }
                    </p>
                  </div>

                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    onClick={() => onNavigate?.("patients", { patientUuid: selectedPatient.patient_uuid })}
                    data-testid="button-view-patient"
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Patient Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={`${glassStyle} rounded-2xl`}>
              <CardContent className="pt-6">
                <div className="text-center text-slate-500 py-8">
                  <ChevronRight className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">Select a patient</p>
                  <p className="text-sm">Click on a patient to view eligibility details</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={`${glassStyle} rounded-2xl`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                <Clock className="h-4 w-4 text-violet-500" />
                Cooldown Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">PPO Insurance</span>
                  <Badge variant="outline">6 months</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Medicare</span>
                  <Badge variant="outline">12 months</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">PGX Testing</span>
                  <Badge variant="outline" className="bg-violet-50 border-violet-200 text-violet-700">Once Only</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Steroid Injection</span>
                  <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">No Limit</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
