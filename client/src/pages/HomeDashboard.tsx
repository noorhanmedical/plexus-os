import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, DollarSign, Loader2, AlertTriangle, Calendar, Brain, Heart, ClipboardList, Receipt, TrendingUp, RefreshCw, Users, Stethoscope } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { UltrasoundProbeIcon } from "@/components/service-icons";

interface BillingRecord {
  source_tab?: string;
  date_of_service?: string;
  patient?: string;
  clinician?: string;
  billing_status?: string;
  paid_amount?: string | number;
  insurance_info?: string;
  comments?: string;
  billing_id?: string;
  invoice_number?: string;
  patient_name?: string;
  patient_uuid?: string;
  service?: string;
  amount?: number;
  status?: string;
  date?: string;
}

interface BillingResponse {
  ok: boolean;
  rows: BillingRecord[];
}

interface CatalogItem {
  ancillary_code: string;
  ancillary_name?: string;
  repeat_policy?: string;
}

interface CatalogResponse {
  ok: boolean;
  data?: CatalogItem[];
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
}

interface HomeDashboardProps {
  onNavigate?: (tab: "home" | "prescreens" | "ancillary" | "finance" | "schedule" | "billing", serviceFilter?: string) => void;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function normalizeBillingRecord(record: BillingRecord): BillingRecord {
  return {
    ...record,
    patient_name: record.patient_name || record.patient,
    date: record.date || record.date_of_service,
  };
}

function getStatusColor(status: string | undefined): string {
  if (!status) return "bg-slate-100 text-slate-700 border-slate-200";
  const s = status.toLowerCase();
  if (s.includes("complete") || s.includes("done")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s.includes("schedule") || s.includes("pending")) return "bg-amber-100 text-amber-700 border-amber-200";
  if (s.includes("eligible") || s.includes("ready")) return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function HomeDashboard({ onNavigate }: HomeDashboardProps) {
  const { data: billingData, isLoading: billingLoading, isError: billingError, refetch: refetchBilling } = useQuery<BillingResponse>({
    queryKey: ["/api/billing/list?limit=50&cursor=0"],
  });

  const { data: catalogResponse, isLoading: catalogLoading } = useQuery<CatalogResponse>({
    queryKey: ["/api/ancillary/catalog"],
  });

  const catalogItems = catalogResponse?.data || [];
  const firstAncillaryCode = catalogItems[0]?.ancillary_code || "";

  const { data: ancillaryPatientsData, isLoading: ancillaryLoading, isError: ancillaryError } = useQuery<AncillaryPatientsResponse>({
    queryKey: [`/api/ancillary/patients?ancillary_code=${firstAncillaryCode}&limit=10`],
    enabled: !!firstAncillaryCode,
  });

  const ancillaryPatients = ancillaryPatientsData?.results || [];

  const rawRecords = billingData?.rows || [];
  const records = rawRecords.map(normalizeBillingRecord);
  
  const brainwaveRecords = rawRecords.filter(r => r.source_tab?.includes("BRAINWAVE")).map(normalizeBillingRecord);
  const ultrasoundRecords = rawRecords.filter(r => r.source_tab?.includes("ULTRASOUND")).map(normalizeBillingRecord);
  const vitalwaveRecords = rawRecords.filter(r => r.source_tab?.includes("VITALWAVE")).map(normalizeBillingRecord);
  
  const brainwaveCount = brainwaveRecords.length;
  const ultrasoundCount = ultrasoundRecords.length;
  const vitalwaveCount = vitalwaveRecords.length;
  const totalCount = records.length;

  const parseAmount = (val: string | number | undefined): number => {
    if (!val) return 0;
    const num = parseFloat(String(val).replace(/[$,]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const brainwaveRevenue = brainwaveRecords.reduce((sum, r) => sum + parseAmount((r as any).claim_paid_amount || r.paid_amount || r.amount), 0);
  const ultrasoundRevenue = ultrasoundRecords.reduce((sum, r) => sum + parseAmount((r as any).claim_paid_amount || r.paid_amount || r.amount), 0);
  const vitalwaveRevenue = vitalwaveRecords.reduce((sum, r) => sum + parseAmount((r as any).claim_paid_amount || r.paid_amount || r.amount), 0);
  const totalRevenue = brainwaveRevenue + ultrasoundRevenue + vitalwaveRevenue;

  // Count claims with payments vs pending
  const brainwavePaid = brainwaveRecords.filter(r => parseAmount((r as any).claim_paid_amount) > 0).length;
  const ultrasoundPaid = ultrasoundRecords.filter(r => parseAmount((r as any).claim_paid_amount) > 0).length;
  const vitalwavePaid = vitalwaveRecords.filter(r => parseAmount((r as any).claim_paid_amount) > 0).length;
  const totalPaid = brainwavePaid + ultrasoundPaid + vitalwavePaid;
  const totalPending = totalCount - totalPaid;

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const last3Brainwave = brainwaveRecords.slice(0, 3);
  const last3Ultrasound = ultrasoundRecords.slice(0, 3);
  const last3Vitalwave = vitalwaveRecords.slice(0, 3);

  const handleViewAllBilling = () => {
    if (onNavigate) {
      onNavigate("billing", "all");
    }
  };

  const handleNavigateToService = (serviceFilter: string) => {
    if (onNavigate) {
      onNavigate("billing", serviceFilter);
    }
  };

  const glassCardStyle = "backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-3xl overflow-hidden glass-tile-hover";
  const glassButtonStyle = "backdrop-blur-md bg-white/60 border border-slate-200/50 transition-all duration-300 rounded-2xl smoke-fill glass-tile-hover";
  const glassTileStyle = "backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-3xl smoke-fill glass-tile-hover";

  // Calculate patients due for ancillary services based on billing dates
  const ancillaryDuePatients = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    const patientMap = new Map<string, { name: string; lastService: Date; serviceType: string; dueIn: string }>();
    
    records.forEach(r => {
      const patientName = r.patient_name || r.patient || "Unknown";
      const serviceDate = r.date ? new Date(r.date) : null;
      const serviceType = r.source_tab?.includes("BRAINWAVE") ? "BrainWave" :
                          r.source_tab?.includes("ULTRASOUND") ? "Ultrasound" :
                          r.source_tab?.includes("VITALWAVE") ? "VitalWave" : "Other";
      
      if (serviceDate && patientName !== "Unknown") {
        const existing = patientMap.get(patientName);
        if (!existing || serviceDate > existing.lastService) {
          let dueIn = "";
          if (serviceDate <= twelveMonthsAgo) {
            dueIn = "Overdue (12+ mo)";
          } else if (serviceDate <= sixMonthsAgo) {
            dueIn = "Due Soon (6+ mo)";
          }
          
          if (dueIn) {
            patientMap.set(patientName, { name: patientName, lastService: serviceDate, serviceType, dueIn });
          }
        }
      }
    });
    
    return Array.from(patientMap.values())
      .sort((a, b) => a.lastService.getTime() - b.lastService.getTime())
      .slice(0, 5);
  }, [records]);

  const handleRefresh = () => {
    refetchBilling();
  };

  return (
    <div className="space-y-5 p-4 min-h-full relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0a28]">Clinical Dashboard</h1>
          <p className="text-slate-500 text-sm">Patient management overview</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={billingLoading}
          className="gap-2"
          data-testid="button-refresh-dashboard"
        >
          <RefreshCw className={`h-4 w-4 ${billingLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Row 1: Schedule, Prescreens, Ancillary Portal, Patient Database - BOLD TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          className={`${glassTileStyle} flex flex-col items-center justify-center py-6 px-4 cursor-pointer group`}
          onClick={() => onNavigate?.("schedule")}
          data-testid="button-schedule"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-300 to-indigo-500 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-xl mb-3">
            <Calendar className="h-10 w-10 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-[#1a0a28] font-bold text-lg">Schedule</p>
        </button>

        <button
          className={`${glassTileStyle} flex flex-col items-center justify-center py-6 px-4 cursor-pointer group`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-prescreens"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-xl mb-3">
            <Sparkles className="h-10 w-10 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-[#1a0a28] font-bold text-lg">Prescreens</p>
        </button>

        <button
          className={`${glassTileStyle} flex flex-col items-center justify-center py-6 px-4 cursor-pointer group`}
          onClick={() => onNavigate?.("ancillary")}
          data-testid="button-ancillary-portal"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-xl mb-3">
            <Stethoscope className="h-10 w-10 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-[#1a0a28] font-bold text-lg">Ancillary Portal</p>
        </button>

        <button
          className={`${glassTileStyle} flex flex-col items-center justify-center py-6 px-4 cursor-pointer group`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-patient-database"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-xl mb-3">
            <Users className="h-10 w-10 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-[#1a0a28] font-bold text-lg">Patient Database</p>
        </button>
      </div>

      {/* Row 2: Ancillary Service Patient Tracker */}
      <button 
        className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer smoke-fill`}
        onClick={() => onNavigate?.("ancillary")}
        data-testid="button-ancillary-card"
      >
        <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
          <ClipboardList className="h-5 w-5 text-white" />
          <p className="text-white font-bold text-lg drop-shadow-sm">Ancillary Service Patient Tracker</p>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-600 text-sm font-medium">Patients due for follow-up services (6mo/12mo)</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-purple-700 rounded-lg"
              onClick={() => onNavigate?.("ancillary")}
              data-testid="button-view-all-ancillary"
            >
              View All
            </Button>
          </div>

          {billingLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* BrainWave Patient Tracking */}
              <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-violet-800">BrainWave</p>
                    <p className="text-xs text-violet-600">{ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").length} patients due</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").slice(0, 3).map((patient, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-1">
                      <span className="text-slate-700 truncate max-w-[120px] font-medium">{patient.name}</span>
                      <Badge className={patient.dueIn.includes("Overdue") ? "bg-red-100 text-red-700 border-red-200 text-xs" : "bg-amber-100 text-amber-700 border-amber-200 text-xs"}>
                        {patient.dueIn.includes("Overdue") ? "12+ mo" : "6+ mo"}
                      </Badge>
                    </div>
                  ))}
                  {ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").length === 0 && (
                    <p className="text-sm text-slate-500 py-1">No patients due</p>
                  )}
                </div>
              </div>

              {/* Ultrasound Patient Tracking */}
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center">
                    <UltrasoundProbeIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-800">Ultrasound</p>
                    <p className="text-xs text-blue-600">{ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").length} patients due</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").slice(0, 3).map((patient, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-1">
                      <span className="text-slate-700 truncate max-w-[120px] font-medium">{patient.name}</span>
                      <Badge className={patient.dueIn.includes("Overdue") ? "bg-red-100 text-red-700 border-red-200 text-xs" : "bg-amber-100 text-amber-700 border-amber-200 text-xs"}>
                        {patient.dueIn.includes("Overdue") ? "12+ mo" : "6+ mo"}
                      </Badge>
                    </div>
                  ))}
                  {ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").length === 0 && (
                    <p className="text-sm text-slate-500 py-1">No patients due</p>
                  )}
                </div>
              </div>

              {/* VitalWave Patient Tracking */}
              <div className="p-3 rounded-xl bg-red-50/50 border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-red-800">VitalWave</p>
                    <p className="text-xs text-red-600">{ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").length} patients due</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").slice(0, 3).map((patient, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-1">
                      <span className="text-slate-700 truncate max-w-[120px] font-medium">{patient.name}</span>
                      <Badge className={patient.dueIn.includes("Overdue") ? "bg-red-100 text-red-700 border-red-200 text-xs" : "bg-amber-100 text-amber-700 border-amber-200 text-xs"}>
                        {patient.dueIn.includes("Overdue") ? "12+ mo" : "6+ mo"}
                      </Badge>
                    </div>
                  ))}
                  {ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").length === 0 && (
                    <p className="text-sm text-slate-500 py-1">No patients due</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Row 3: Billing Dashboard */}
      <button 
        className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer smoke-fill`}
        onClick={handleViewAllBilling}
        data-testid="button-billing-dashboard"
      >
        <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
          <Receipt className="h-5 w-5 text-white" />
          <p className="text-white font-bold text-lg drop-shadow-sm">Billing Dashboard</p>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {billingLoading ? (
                <div className="flex items-center gap-2 animate-pulse">
                  <div className="w-14 h-8 rounded-lg bg-slate-200/70" />
                  <div className="w-14 h-8 rounded-lg bg-slate-200/70" />
                  <div className="w-14 h-8 rounded-lg bg-slate-200/70" />
                </div>
              ) : (
                <>
                  <div className="text-center px-3 py-1 rounded-lg bg-violet-100/70 border border-violet-200">
                    <p className="text-lg font-bold text-violet-800">{brainwaveCount}</p>
                    <p className="text-xs text-violet-600 font-medium">Brain</p>
                  </div>
                  <div className="text-center px-3 py-1 rounded-lg bg-blue-100/70 border border-blue-200">
                    <p className="text-lg font-bold text-blue-700">{ultrasoundCount}</p>
                    <p className="text-xs text-blue-600 font-medium">Ultra</p>
                  </div>
                  <div className="text-center px-3 py-1 rounded-lg bg-red-100/70 border border-red-200">
                    <p className="text-lg font-bold text-red-700">{vitalwaveCount}</p>
                    <p className="text-xs text-red-600 font-medium">Vital</p>
                  </div>
                  <p className="text-slate-700 font-bold ml-2">{totalCount} Total Records</p>
                </>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-purple-700 rounded-lg"
              onClick={handleViewAllBilling}
              data-testid="button-view-all-billing"
            >
              View All
            </Button>
          </div>

          {billingLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : billingError ? (
            <div className="text-center py-6">
              <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              <p className="text-slate-600 text-sm">Failed to load billing data</p>
            </div>
          ) : records.length === 0 ? (
            <p className="text-slate-600 text-center py-6">No billing records</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* BrainWave */}
              <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-violet-800">BrainWave</p>
                    <p className="text-xs text-violet-600">Recent patients</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {last3Brainwave.length > 0 ? last3Brainwave.map((r, i) => (
                    <button 
                      key={i} 
                      className="w-full flex justify-between items-center text-sm hover:bg-violet-100/50 rounded-lg py-1 px-1 transition-colors"
                      onClick={() => handleNavigateToService("brainwave")}
                      data-testid={`button-billing-brainwave-${i}`}
                    >
                      <span className="text-slate-700 truncate max-w-[110px] font-medium">{r.patient_name || "Unknown"}</span>
                      <span className="text-violet-600 font-semibold text-xs">{formatDate(r.date)}</span>
                    </button>
                  )) : <p className="text-sm text-slate-500 py-1">No recent records</p>}
                </div>
              </div>

              {/* Ultrasound */}
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center">
                    <UltrasoundProbeIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-800">Ultrasound</p>
                    <p className="text-xs text-blue-600">Recent patients</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {last3Ultrasound.length > 0 ? last3Ultrasound.map((r, i) => (
                    <button 
                      key={i} 
                      className="w-full flex justify-between items-center text-sm hover:bg-blue-100/50 rounded-lg py-1 px-1 transition-colors"
                      onClick={() => handleNavigateToService("ultrasound")}
                      data-testid={`button-billing-ultrasound-${i}`}
                    >
                      <span className="text-slate-700 truncate max-w-[110px] font-medium">{r.patient_name || "Unknown"}</span>
                      <span className="text-blue-600 font-semibold text-xs">{formatDate(r.date)}</span>
                    </button>
                  )) : <p className="text-sm text-slate-500 py-1">No recent records</p>}
                </div>
              </div>

              {/* VitalWave */}
              <div className="p-3 rounded-xl bg-red-50/50 border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-red-800">VitalWave</p>
                    <p className="text-xs text-red-600">Recent patients</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {last3Vitalwave.length > 0 ? last3Vitalwave.map((r, i) => (
                    <button 
                      key={i} 
                      className="w-full flex justify-between items-center text-sm hover:bg-red-100/50 rounded-lg py-1 px-1 transition-colors"
                      onClick={() => handleNavigateToService("vitalwave")}
                      data-testid={`button-billing-vitalwave-${i}`}
                    >
                      <span className="text-slate-700 truncate max-w-[110px] font-medium">{r.patient_name || "Unknown"}</span>
                      <span className="text-red-600 font-semibold text-xs">{formatDate(r.date)}</span>
                    </button>
                  )) : <p className="text-sm text-slate-500 py-1">No recent records</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Row 4: Finance Dashboard */}
      <button 
        className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer smoke-fill`}
        onClick={handleViewAllBilling}
        data-testid="button-finance-dashboard"
      >
        <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
          <TrendingUp className="h-5 w-5 text-white" />
          <p className="text-white font-bold text-lg drop-shadow-sm">Finance Dashboard</p>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                <DollarSign className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
              {billingLoading ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-6 rounded-lg bg-slate-200/70" />
                    <div className="w-20 h-6 rounded-lg bg-slate-200/70" />
                    <div className="w-20 h-6 rounded-lg bg-slate-200/70" />
                  </div>
                  <div className="w-32 h-4 rounded bg-slate-200/70" />
                </div>
              ) : totalRevenue > 0 ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-700 font-bold border border-purple-200">{formatCurrency(brainwaveRevenue)}</span>
                    <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-bold border border-blue-200">{formatCurrency(ultrasoundRevenue)}</span>
                    <span className="px-3 py-1 rounded-lg bg-red-100 text-red-700 font-bold border border-red-200">{formatCurrency(vitalwaveRevenue)}</span>
                  </div>
                  <p className="text-slate-700 font-bold">{formatCurrency(totalRevenue)} Total Collected</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">{totalPending}</p>
                    <p className="text-xs text-slate-600 font-medium">Claims Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-600">{totalPaid}</p>
                    <p className="text-xs text-slate-600 font-medium">Claims Paid</p>
                  </div>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-purple-700 rounded-lg"
              onClick={handleViewAllBilling}
              data-testid="button-view-finance"
            >
              View Details
            </Button>
          </div>
        </div>
      </button>
    </div>
  );
}
