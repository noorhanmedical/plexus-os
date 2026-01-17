import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, DollarSign, Loader2, AlertTriangle, Calendar, Brain, Heart, ClipboardList, Receipt, TrendingUp, RefreshCw, Users, Stethoscope, Star } from "lucide-react";
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

  // Financial metrics by status
  const getClaimStatus = (r: BillingRecord): "pending" | "submitted" | "paid" => {
    const status = ((r as any).billing_status || r.status || "").toLowerCase();
    const paidAmount = parseAmount((r as any).claim_paid_amount || r.paid_amount);
    if (paidAmount > 0 || status.includes("paid") || status.includes("complete")) return "paid";
    if (status.includes("submit") || status.includes("sent") || status.includes("process")) return "submitted";
    return "pending";
  };

  // Filter records from start of current year
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const ytdRecords = records.filter(r => {
    const date = r.date ? new Date(r.date) : null;
    return date && date >= startOfYear;
  });

  // Count by status for each service (YTD)
  const brainwaveYTD = brainwaveRecords.filter(r => {
    const date = r.date ? new Date(r.date) : null;
    return date && date >= startOfYear;
  });
  const ultrasoundYTD = ultrasoundRecords.filter(r => {
    const date = r.date ? new Date(r.date) : null;
    return date && date >= startOfYear;
  });
  const vitalwaveYTD = vitalwaveRecords.filter(r => {
    const date = r.date ? new Date(r.date) : null;
    return date && date >= startOfYear;
  });

  const brainwavePending = brainwaveYTD.filter(r => getClaimStatus(r) === "pending").length;
  const brainwaveSubmitted = brainwaveYTD.filter(r => getClaimStatus(r) === "submitted").length;
  const brainwavePaidCount = brainwaveYTD.filter(r => getClaimStatus(r) === "paid").length;

  const ultrasoundPending = ultrasoundYTD.filter(r => getClaimStatus(r) === "pending").length;
  const ultrasoundSubmitted = ultrasoundYTD.filter(r => getClaimStatus(r) === "submitted").length;
  const ultrasoundPaidCount = ultrasoundYTD.filter(r => getClaimStatus(r) === "paid").length;

  const vitalwavePending = vitalwaveYTD.filter(r => getClaimStatus(r) === "pending").length;
  const vitalwaveSubmitted = vitalwaveYTD.filter(r => getClaimStatus(r) === "submitted").length;
  const vitalwavePaidCount = vitalwaveYTD.filter(r => getClaimStatus(r) === "paid").length;

  const totalPendingClaims = brainwavePending + ultrasoundPending + vitalwavePending;
  const totalSubmittedClaims = brainwaveSubmitted + ultrasoundSubmitted + vitalwaveSubmitted;
  const totalPaidClaims = brainwavePaidCount + ultrasoundPaidCount + vitalwavePaidCount;

  // Legacy counts for backward compatibility
  const brainwavePaid = brainwaveRecords.filter(r => parseAmount((r as any).claim_paid_amount) > 0).length;
  const ultrasoundPaid = ultrasoundRecords.filter(r => parseAmount((r as any).claim_paid_amount) > 0).length;
  const vitalwavePaid = vitalwaveRecords.filter(r => parseAmount((r as any).claim_paid_amount) > 0).length;
  const totalPaid = brainwavePaid + ultrasoundPaid + vitalwavePaid;
  const totalPending = totalCount - totalPaid;

  // Calculate average claim value
  const avgClaimValue = totalPaidClaims > 0 ? totalRevenue / totalPaidClaims : 0;

  // Monthly revenue data for chart (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const months: { month: string; revenue: number; claims: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthDate.toLocaleDateString("en-US", { month: "short" });
      
      const monthRecords = records.filter(r => {
        const date = r.date ? new Date(r.date) : null;
        return date && date >= monthDate && date <= monthEnd;
      });
      
      const revenue = monthRecords.reduce((sum, r) => sum + parseAmount((r as any).claim_paid_amount || r.paid_amount || r.amount), 0);
      months.push({ month: monthName, revenue, claims: monthRecords.length });
    }
    return months;
  }, [records]);

  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

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

  const glassCardStyle = "backdrop-blur-xl bg-white border border-slate-200 shadow-xl rounded-3xl overflow-hidden";
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
      <div className="flex items-center justify-end">
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
          className={`${glassTileStyle} flex flex-col items-center justify-center py-8 px-4 cursor-pointer group`}
          onClick={() => onNavigate?.("schedule")}
          data-testid="button-schedule"
        >
          <Calendar className="h-16 w-16 text-indigo-700 group-hover:scale-110 transition-transform duration-300 mb-3" strokeWidth={2} />
          <p className="text-[#1a0a28] font-bold text-lg">Schedule</p>
        </button>

        <button
          className={`${glassTileStyle} flex flex-col items-center justify-center py-8 px-4 cursor-pointer group`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-prescreens"
        >
          <Sparkles className="h-16 w-16 text-violet-700 group-hover:scale-110 transition-transform duration-300 mb-3" strokeWidth={2} />
          <p className="text-[#1a0a28] font-bold text-lg">Prescreens</p>
        </button>

        <button
          className={`${glassTileStyle} flex flex-col items-center justify-center py-8 px-4 cursor-pointer group`}
          onClick={() => onNavigate?.("ancillary")}
          data-testid="button-ancillary-portal"
        >
          <Stethoscope className="h-16 w-16 text-purple-700 group-hover:scale-110 transition-transform duration-300 mb-3" strokeWidth={2} />
          <p className="text-[#1a0a28] font-bold text-lg">Ancillary Portal</p>
        </button>

        <button
          className={`${glassTileStyle} flex flex-col items-center justify-center py-8 px-4 cursor-pointer group`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-patient-database"
        >
          <Users className="h-16 w-16 text-indigo-600 group-hover:scale-110 transition-transform duration-300 mb-3" strokeWidth={2} />
          <p className="text-[#1a0a28] font-bold text-lg">Patient Database</p>
        </button>
      </div>

      {/* Row 2: Ancillary Service Patient Tracker */}
      <button 
        className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer`}
        onClick={() => onNavigate?.("ancillary")}
        data-testid="button-ancillary-card"
      >
        <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
          <ClipboardList className="h-5 w-5 text-white" />
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <p className="text-white font-bold text-lg drop-shadow-sm">Ancillary Service Patient Tracker</p>
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          </div>
        </div>
        <div className="p-0">
          {billingLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-200">
              {/* BrainWave Patient Tracking */}
              <div className="p-4 service-tile-violet cursor-pointer transition-all duration-300 group min-h-[160px]">
                <div className="flex items-center gap-3 mb-3">
                  <Brain className="h-12 w-12 text-violet-600 transition-transform duration-300 group-hover:scale-125" strokeWidth={2.5} />
                  <div>
                    <p className="font-semibold text-black text-lg">BrainWave</p>
                    <p className="text-xs text-black">{ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").length} patients due</p>
                  </div>
                </div>
                <div className="space-y-2 min-h-[72px]">
                  {ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").slice(0, 3).map((patient, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-black truncate max-w-[140px]">{patient.name}</span>
                      <Badge className="bg-slate-200 text-black border-slate-300 text-xs">
                        {patient.dueIn.includes("Overdue") ? "12+ mo" : "6+ mo"}
                      </Badge>
                    </div>
                  ))}
                  {ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").length === 0 && (
                    <p className="text-sm text-black">No patients due</p>
                  )}
                </div>
              </div>

              {/* Ultrasound Patient Tracking */}
              <div className="p-4 service-tile-blue cursor-pointer transition-all duration-300 group min-h-[160px]">
                <div className="flex items-center gap-3 mb-3">
                  <UltrasoundProbeIcon className="h-12 w-12 text-blue-600 transition-transform duration-300 group-hover:scale-125 -rotate-[20deg]" />
                  <div>
                    <p className="font-semibold text-black text-lg">Ultrasound</p>
                    <p className="text-xs text-black">{ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").length} patients due</p>
                  </div>
                </div>
                <div className="space-y-2 min-h-[72px]">
                  {ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").slice(0, 3).map((patient, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-black truncate max-w-[140px]">{patient.name}</span>
                      <Badge className="bg-slate-200 text-black border-slate-300 text-xs">
                        {patient.dueIn.includes("Overdue") ? "12+ mo" : "6+ mo"}
                      </Badge>
                    </div>
                  ))}
                  {ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").length === 0 && (
                    <p className="text-sm text-black">No patients due</p>
                  )}
                </div>
              </div>

              {/* VitalWave Patient Tracking */}
              <div className="p-4 service-tile-red cursor-pointer transition-all duration-300 group min-h-[160px]">
                <div className="flex items-center gap-3 mb-3">
                  <Heart className="h-12 w-12 text-red-600 transition-transform duration-300 group-hover:scale-125" strokeWidth={2.5} />
                  <div>
                    <p className="font-semibold text-black text-lg">VitalWave</p>
                    <p className="text-xs text-black">{ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").length} patients due</p>
                  </div>
                </div>
                <div className="space-y-2 min-h-[72px]">
                  {ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").slice(0, 3).map((patient, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-black truncate max-w-[140px]">{patient.name}</span>
                      <Badge className="bg-slate-200 text-black border-slate-300 text-xs">
                        {patient.dueIn.includes("Overdue") ? "12+ mo" : "6+ mo"}
                      </Badge>
                    </div>
                  ))}
                  {ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").length === 0 && (
                    <p className="text-sm text-black">No patients due</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Row 3: Billing Dashboard */}
      <button 
        className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer`}
        onClick={handleViewAllBilling}
        data-testid="button-billing-dashboard"
      >
        <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
          <Receipt className="h-5 w-5 text-white" />
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <p className="text-white font-bold text-lg drop-shadow-sm">Billing Dashboard</p>
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          </div>
        </div>
        <div className="p-0">
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
            <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-200">
              {/* BrainWave */}
              <div className="p-5 service-tile-violet cursor-pointer transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="h-12 w-12 text-violet-600 transition-transform duration-300 group-hover:scale-125" strokeWidth={2.5} />
                  <div>
                    <p className="font-semibold text-black text-lg">BrainWave</p>
                    <p className="text-xs text-black">{currentYear} YTD</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-2xl text-black">{brainwavePending}</p>
                    <p className="text-[10px] text-black">To Submit</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl text-black">{brainwaveSubmitted}</p>
                    <p className="text-[10px] text-black">Submitted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl text-black">{brainwavePaidCount}</p>
                    <p className="text-[10px] text-black">Paid</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-black text-center">{formatCurrency(brainwaveRevenue)} collected</p>
                </div>
              </div>

              {/* Ultrasound */}
              <div className="p-5 service-tile-blue cursor-pointer transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-4">
                  <UltrasoundProbeIcon className="h-12 w-12 text-blue-600 transition-transform duration-300 group-hover:scale-125 -rotate-[20deg]" />
                  <div>
                    <p className="font-semibold text-black text-lg">Ultrasound</p>
                    <p className="text-xs text-black">{currentYear} YTD</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-2xl text-black">{ultrasoundPending}</p>
                    <p className="text-[10px] text-black">To Submit</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl text-black">{ultrasoundSubmitted}</p>
                    <p className="text-[10px] text-black">Submitted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl text-black">{ultrasoundPaidCount}</p>
                    <p className="text-[10px] text-black">Paid</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-black text-center">{formatCurrency(ultrasoundRevenue)} collected</p>
                </div>
              </div>

              {/* VitalWave */}
              <div className="p-5 service-tile-red cursor-pointer transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="h-12 w-12 text-red-600 transition-transform duration-300 group-hover:scale-125" strokeWidth={2.5} />
                  <div>
                    <p className="font-semibold text-black text-lg">VitalWave</p>
                    <p className="text-xs text-black">{currentYear} YTD</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-2xl text-black">{vitalwavePending}</p>
                    <p className="text-[10px] text-black">To Submit</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl text-black">{vitalwaveSubmitted}</p>
                    <p className="text-[10px] text-black">Submitted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl text-black">{vitalwavePaidCount}</p>
                    <p className="text-[10px] text-black">Paid</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-black text-center">{formatCurrency(vitalwaveRevenue)} collected</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Row 4: Finance Dashboard */}
      <button 
        className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer`}
        onClick={handleViewAllBilling}
        data-testid="button-finance-dashboard"
      >
        <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
          <TrendingUp className="h-5 w-5 text-white" />
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <p className="text-white font-bold text-lg drop-shadow-sm">Finance Dashboard</p>
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          </div>
        </div>
        <div className="p-5">
          {billingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Key Metrics */}
              <div className="space-y-0">
                {/* Total Revenue */}
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <DollarSign className="h-10 w-10 text-green-600 transition-transform duration-300 hover:scale-110" strokeWidth={2.5} />
                      <div>
                        <p className="text-3xl font-bold text-black">{formatCurrency(totalRevenue)}</p>
                        <p className="text-sm text-black">Total Revenue Collected</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-black">{currentYear} YTD</p>
                    </div>
                  </div>
                </div>

                {/* Revenue by Service */}
                <div className="grid grid-cols-3 gap-0 divide-x divide-slate-200">
                  <div className="p-5 cursor-pointer group hover:bg-violet-50/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <Brain className="h-12 w-12 text-violet-600 transition-transform duration-300 group-hover:scale-110" strokeWidth={2.5} />
                      <p className="text-base font-semibold text-black">BrainWave</p>
                    </div>
                    <p className="text-2xl font-bold text-black">{formatCurrency(brainwaveRevenue)}</p>
                  </div>
                  <div className="p-5 cursor-pointer group hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <UltrasoundProbeIcon className="h-12 w-12 text-blue-600 transition-transform duration-300 group-hover:scale-110 -rotate-[20deg]" />
                      <p className="text-base font-semibold text-black">Ultrasound</p>
                    </div>
                    <p className="text-2xl font-bold text-black">{formatCurrency(ultrasoundRevenue)}</p>
                  </div>
                  <div className="p-5 cursor-pointer group hover:bg-red-50/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <Heart className="h-12 w-12 text-red-600 transition-transform duration-300 group-hover:scale-110" strokeWidth={2.5} />
                      <p className="text-base font-semibold text-black">VitalWave</p>
                    </div>
                    <p className="text-2xl font-bold text-black">{formatCurrency(vitalwaveRevenue)}</p>
                  </div>
                </div>

              </div>

              {/* Right: Revenue Chart */}
              <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-black">Monthly Revenue</p>
                  <p className="text-xs text-black">Last 6 Months</p>
                </div>
                <div className="flex items-end justify-between gap-3 h-36">
                  {monthlyRevenue.map((m, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-gradient-to-t from-[#3730a3] to-[#5b21b6] rounded-t-md transition-all duration-300 hover:from-[#4338ca] hover:to-[#6d28d9]"
                        style={{ 
                          height: `${Math.max((m.revenue / maxMonthlyRevenue) * 100, 8)}%`,
                          minHeight: '12px'
                        }}
                        title={`${m.month}: ${formatCurrency(m.revenue)}`}
                      />
                      <p className="text-xs text-black mt-2">{m.month}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-[#3730a3] to-[#5b21b6]" />
                    <p className="text-xs text-black">Revenue</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-black rounded-lg text-xs h-7"
                    onClick={handleViewAllBilling}
                    data-testid="button-view-finance"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
