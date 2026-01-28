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

interface PatientData {
  patient_uuid: string;
  first_name: string;
  last_name: string;
  dob?: string;
  phone?: string;
  email?: string;
}

interface EligibilityTrackerProps {
  onNavigate?: (tab: string, data?: any) => void;
  onPatientSelect?: (patient: PatientData) => void;
}

const glassStyle = "bg-card border border-border shadow-xl dark:backdrop-blur-xl dark:bg-gradient-to-br dark:from-slate-800/90 dark:via-slate-850/85 dark:to-slate-900/90 dark:border-slate-700/50";

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
      return { className: "bg-rose-500/20 text-rose-300 border-rose-500/30", label: "Overdue" };
    case "due_soon":
      return { className: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Due Soon" };
    case "eligible":
      return { className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Eligible" };
  }
}

const dateRangeOptions = [
  { id: "all", label: "All Time" },
  { id: "30", label: "Last 30 Days" },
  { id: "180", label: "Last 6 Months" },
  { id: "365", label: "Last Year" },
];

export function EligibilityTracker({ onNavigate, onPatientSelect }: EligibilityTrackerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
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
      
      const insuranceInfo = ((r as any).insurance_info || "").toLowerCase();
      let payorType: "Medicare" | "PPO" = "PPO";
      if (insuranceInfo.includes("medicare")) {
        payorType = "Medicare";
      }
      
      if (serviceDate && patientName !== "Unknown" && serviceType !== "Other") {
        const key = `${patientUuid}-${serviceType}`;
        const existing = patientMap.get(key);
        
        if (!existing || serviceDate > existing.last_service_date) {
          const daysSince = Math.floor((now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));
          const cooldown = payorType === "Medicare" ? cooldownDays.medicare : cooldownDays.ppo;
          
          let eligibilityStatus: PatientEligibility["eligibility_status"];
          if (daysSince > cooldown + 60) {
            eligibilityStatus = "overdue";
          } else if (daysSince >= cooldown) {
            eligibilityStatus = "eligible";
          } else if (daysSince >= cooldown - 30) {
            eligibilityStatus = "due_soon";
          } else {
            return;
          }

          patientMap.set(key, {
            patient_uuid: patientUuid,
            patient_name: patientName,
            service_type: serviceType,
            last_service_date: serviceDate,
            days_since_service: daysSince,
            cooldown_days: cooldown,
            eligibility_status: eligibilityStatus,
            payor_assumed: payorType,
          });
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
    const now = new Date();
    return patientEligibilities.filter(p => {
      const matchesSearch = searchTerm === "" || 
        p.patient_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = serviceFilter === "all" || 
        p.service_type.toLowerCase() === serviceFilter.toLowerCase();
      const matchesStatus = statusFilter === "all" || 
        p.eligibility_status === statusFilter;
      
      let matchesDateRange = true;
      if (dateRangeFilter !== "all") {
        const days = parseInt(dateRangeFilter);
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        matchesDateRange = p.last_service_date >= cutoffDate;
      }
      
      return matchesSearch && matchesService && matchesStatus && matchesDateRange;
    });
  }, [patientEligibilities, searchTerm, serviceFilter, statusFilter, dateRangeFilter]);

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
    <div className="space-y-4 p-4 min-h-full bg-background dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-850 dark:to-slate-900">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Eligibility Tracker</h1>
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
              <div className="p-2 rounded-xl bg-rose-500/20">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.overdue}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.dueSoon}</p>
                <p className="text-sm text-muted-foreground">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.eligible}</p>
                <p className="text-sm text-muted-foreground">Eligible</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/20">
                <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.brainwave}</p>
                <p className="text-sm text-muted-foreground">BrainWave</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20">
                <UltrasoundProbeIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.ultrasound}</p>
                <p className="text-sm text-muted-foreground">Ultrasound</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20">
                <Heart className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.vitalwave}</p>
                <p className="text-sm text-muted-foreground">VitalWave</p>
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
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  Patients Due for Re-Testing
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                    <SelectTrigger className="w-[140px] h-9" data-testid="select-date-range">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateRangeOptions.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
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
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
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
                          className={`p-3 rounded-xl border transition-all cursor-pointer hover:bg-muted dark:hover:bg-slate-700/50 ${
                            selectedPatient?.patient_uuid === patient.patient_uuid && 
                            selectedPatient?.service_type === patient.service_type
                              ? 'bg-teal-500/20 border-teal-500/30' 
                              : 'bg-muted/50 dark:bg-slate-800/50 border-border dark:border-slate-700/50'
                          }`}
                          onClick={() => setSelectedPatient(patient)}
                          data-testid={`eligibility-patient-${patient.patient_uuid}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-xl bg-muted dark:bg-slate-700/50 shrink-0">
                                <ServiceIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">
                                  {patient.patient_name}
                                </p>
                                <p className="text-sm text-muted-foreground">{patient.service_type}</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
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
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  Patient Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-bold text-foreground">
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

                  <div className="p-3 rounded-xl bg-muted dark:bg-slate-700/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Service Due</p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const ServiceIcon = getServiceIcon(selectedPatient.service_type);
                        return <ServiceIcon className="h-5 w-5 text-teal-400" />;
                      })()}
                      <span className="font-semibold text-foreground">{selectedPatient.service_type}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-muted dark:bg-slate-700/50">
                      <p className="text-xs font-medium text-muted-foreground">Last Service</p>
                      <p className="font-semibold text-foreground">
                        {selectedPatient.last_service_date.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted dark:bg-slate-700/50">
                      <p className="text-xs font-medium text-muted-foreground">Days Since</p>
                      <p className="font-semibold text-foreground">
                        {selectedPatient.days_since_service} days
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-violet-500/20 border border-violet-500/30">
                    <p className="text-xs font-medium text-violet-300 mb-1">Cooldown Period</p>
                    <p className="text-sm text-violet-200">
                      {selectedPatient.payor_assumed === "Medicare" ? "12 months" : "6 months"} 
                      ({selectedPatient.cooldown_days} days)
                    </p>
                    <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
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
                    <p className="text-xs text-violet-300 mt-1">
                      {selectedPatient.days_since_service >= selectedPatient.cooldown_days
                        ? `Eligible for ${selectedPatient.days_since_service - selectedPatient.cooldown_days} days`
                        : `${selectedPatient.cooldown_days - selectedPatient.days_since_service} days remaining`
                      }
                    </p>
                  </div>

                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    onClick={() => {
                      // Navigate to EMR profile for this patient
                      const nameParts = selectedPatient.patient_name.split(" ");
                      const firstName = nameParts[0] || "";
                      const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "";
                      onPatientSelect?.({
                        patient_uuid: selectedPatient.patient_uuid,
                        first_name: firstName,
                        last_name: lastName,
                      });
                    }}
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
                <div className="text-center text-muted-foreground py-8">
                  <ChevronRight className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">Select a patient</p>
                  <p className="text-sm">Click on a patient to view eligibility details</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={`${glassStyle} rounded-2xl`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Cooldown Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">PPO Insurance</span>
                  <Badge variant="outline" className="border-border text-foreground/70">6 months</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Medicare</span>
                  <Badge variant="outline" className="border-border text-foreground/70">12 months</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">PGX Testing</span>
                  <Badge variant="outline" className="bg-violet-500/20 border-violet-500/30 text-violet-700 dark:text-violet-300">Once Only</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Steroid Injection</span>
                  <Badge variant="outline" className="bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">No Limit</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
