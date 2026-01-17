import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, DollarSign, Loader2, Calendar, Brain, Heart, ClipboardList, Receipt, TrendingUp, RefreshCw, Video, Database, FileText } from "lucide-react";
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

export function HomeDashboard({ onNavigate }: HomeDashboardProps) {
  const { data: billingData, isLoading: billingLoading, refetch: refetchBilling } = useQuery<BillingResponse>({
    queryKey: ["/api/billing/list?limit=50&cursor=0"],
  });

  const { data: catalogResponse } = useQuery<CatalogResponse>({
    queryKey: ["/api/ancillary/catalog"],
  });

  const catalogItems = catalogResponse?.data || [];
  const firstAncillaryCode = catalogItems[0]?.ancillary_code || "";

  const { data: ancillaryPatientsData } = useQuery<AncillaryPatientsResponse>({
    queryKey: [`/api/ancillary/patients?ancillary_code=${firstAncillaryCode}&limit=10`],
    enabled: !!firstAncillaryCode,
  });

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

  const sortByDateDesc = (a: BillingRecord, b: BillingRecord) => {
    const dateA = new Date(a.date || a.date_of_service || 0).getTime();
    const dateB = new Date(b.date || b.date_of_service || 0).getTime();
    return dateB - dateA;
  };

  const last3Brainwave = [...brainwaveRecords].sort(sortByDateDesc).slice(0, 3);
  const last3Ultrasound = [...ultrasoundRecords].sort(sortByDateDesc).slice(0, 3);
  const last3Vitalwave = [...vitalwaveRecords].sort(sortByDateDesc).slice(0, 3);

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

  const glassCardStyle = "backdrop-blur-xl bg-white/80 border border-white/40 shadow-lg rounded-2xl overflow-hidden";

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

  const notesPending = {
    brainwave: Math.floor(brainwaveCount * 0.3),
    ultrasound: Math.floor(ultrasoundCount * 0.25),
    vitalwave: Math.floor(vitalwaveCount * 0.2),
  };
  const totalNotesPending = notesPending.brainwave + notesPending.ultrasound + notesPending.vitalwave;
  const avgTimePending = "2.3 days";

  // Dark purplish blue color for all icons
  const iconColor = "text-[#3d2b5a]";

  return (
    <div className="flex flex-col h-full p-4 gap-4 relative">
      {/* ROW 1: Square tiles with icons - Schedule, Patient Database, Prescreens, Ancillary Portal */}
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        <div
          className="backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-2xl smoke-fill glass-tile-hover flex flex-col items-center justify-center aspect-square cursor-pointer group"
          onClick={() => onNavigate?.("schedule")}
          data-testid="button-schedule"
        >
          <Calendar className={`h-16 w-16 ${iconColor} mb-3 group-hover:scale-110 transition-transform duration-300`} />
          <p className="text-slate-700 font-semibold text-sm text-center">Schedule</p>
        </div>

        <div
          className="backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-2xl smoke-fill glass-tile-hover flex flex-col items-center justify-center aspect-square cursor-pointer group"
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-patient-database"
        >
          <Database className={`h-16 w-16 ${iconColor} mb-3 group-hover:scale-110 transition-transform duration-300`} />
          <p className="text-slate-700 font-semibold text-sm text-center">Patient Database</p>
        </div>

        <div
          className="backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-2xl smoke-fill glass-tile-hover flex flex-col items-center justify-center aspect-square cursor-pointer group"
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-prescreens"
        >
          <Sparkles className={`h-16 w-16 ${iconColor} mb-3 group-hover:scale-110 transition-transform duration-300`} />
          <p className="text-slate-700 font-semibold text-sm text-center">Prescreens</p>
        </div>

        <div
          className="backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-2xl smoke-fill glass-tile-hover flex flex-col items-center justify-center aspect-square cursor-pointer group"
          onClick={() => onNavigate?.("ancillary")}
          data-testid="button-ancillary-portal"
        >
          <ClipboardList className={`h-16 w-16 ${iconColor} mb-3 group-hover:scale-110 transition-transform duration-300`} />
          <p className="text-slate-700 font-semibold text-sm text-center">Ancillary Portal</p>
        </div>
      </div>

      {/* ROW 2: Ancillary Service Patient Tracker */}
      <div 
        className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer flex-1`}
        onClick={() => onNavigate?.("ancillary")}
        data-testid="button-ancillary-card"
      >
        <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-2 border-b border-white/10">
          <ClipboardList className="h-5 w-5 text-white" />
          <p className="text-white font-bold text-base drop-shadow-sm">Ancillary Service Patient Tracker</p>
        </div>

        {billingLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0 divide-x divide-white/20 h-[calc(100%-3rem)]">
            {/* BrainWave Patient Tracking */}
            <div className="smoke-fill-section-violet py-4 px-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <Brain className="h-8 w-8 text-violet-700" />
                <div>
                  <p className="font-bold text-violet-800 text-base">BrainWave</p>
                  <p className="text-sm text-slate-500">{ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").length} patients due</p>
                </div>
              </div>
            </div>

            {/* Ultrasound Patient Tracking */}
            <div className="smoke-fill-section-blue py-4 px-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <UltrasoundProbeIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-bold text-blue-700 text-base">Ultrasound</p>
                  <p className="text-sm text-slate-500">{ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").length} patients due</p>
                </div>
              </div>
            </div>

            {/* VitalWave Patient Tracking */}
            <div className="smoke-fill-section-red py-4 px-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <Heart className="h-8 w-8 text-red-600" />
                <div>
                  <p className="font-bold text-red-700 text-base">VitalWave</p>
                  <p className="text-sm text-slate-500">{ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").length} patients due</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ROW 3: Billing Overview + Finance Dashboard */}
      <div className="grid grid-cols-2 gap-2">
        {/* Billing Overview - Combined tile with service columns */}
        <div 
          className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer`}
          onClick={handleViewAllBilling}
          data-testid="button-billing-card"
        >
          <div className="w-full h-10 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-2 border-b border-white/10">
            <Receipt className="h-4 w-4 text-white" />
            <p className="text-white font-bold text-sm drop-shadow-sm">Billing Overview</p>
          </div>

          {billingLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-slate-600 text-center py-4 text-sm">No billing records</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-x divide-white/20">
              {/* BrainWave */}
              <div className="smoke-fill-section-violet py-3 px-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-300/60 to-purple-400/60 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <Brain className="h-3 w-3 text-violet-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-violet-800 text-xs">BrainWave</p>
                    <p className="text-xs text-slate-500">{brainwaveCount} records</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{last3Brainwave.length > 0 ? "Recent activity" : "No recent records"}</p>
              </div>

              {/* Ultrasound */}
              <div className="smoke-fill-section-blue py-3 px-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-200/60 to-cyan-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <UltrasoundProbeIcon className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700 text-xs">Ultrasound</p>
                    <p className="text-xs text-slate-500">{ultrasoundCount} records</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{last3Ultrasound.length > 0 ? "Recent activity" : "No recent records"}</p>
              </div>

              {/* VitalWave */}
              <div className="smoke-fill-section-red py-3 px-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-200/60 to-rose-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <Heart className="h-3 w-3 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-700 text-xs">VitalWave</p>
                    <p className="text-xs text-slate-500">{vitalwaveCount} records</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{last3Vitalwave.length > 0 ? "Recent activity" : "No recent records"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Finance Dashboard - Compact */}
        <div
          className={`${glassCardStyle} flex flex-col cursor-pointer group smoke-fill glass-tile-hover`}
          onClick={handleViewAllBilling}
          data-testid="button-finance"
        >
          <div className="w-full h-10 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-2 border-b border-white/10">
            <DollarSign className="h-4 w-4 text-white" />
            <p className="text-white font-bold text-sm drop-shadow-sm">Finance Dashboard</p>
          </div>
          <div className="p-3 flex items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-200/60 to-teal-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <TrendingUp className="h-5 w-5 text-emerald-800" />
            </div>
            {billingLoading ? (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-12 h-4 rounded-full bg-slate-200/70" />
              </div>
            ) : totalRevenue > 0 ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-xs">
                  <span className="px-1.5 py-0.5 rounded-full backdrop-blur-sm bg-purple-100/70 text-purple-700 font-semibold border border-purple-200/50">{formatCurrency(brainwaveRevenue)}</span>
                  <span className="px-1.5 py-0.5 rounded-full backdrop-blur-sm bg-blue-100/70 text-blue-700 font-semibold border border-blue-200/50">{formatCurrency(ultrasoundRevenue)}</span>
                  <span className="px-1.5 py-0.5 rounded-full backdrop-blur-sm bg-red-100/70 text-red-700 font-semibold border border-red-200/50">{formatCurrency(vitalwaveRevenue)}</span>
                </div>
                <p className="text-slate-600 text-xs font-medium mt-1">{formatCurrency(totalRevenue)} Total</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg font-bold text-purple-700">{totalPending}</p>
                <p className="text-xs text-slate-600">Claims Pending</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 4: Notes + Revenue Trend - Compact */}
      <div className="grid grid-cols-2 gap-2">
        {/* Notes Tile - Compact */}
        <div 
          className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-notes-card"
        >
          <div className="w-full h-10 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-2 border-b border-white/10">
            <FileText className="h-4 w-4 text-white" />
            <p className="text-white font-bold text-sm drop-shadow-sm">Notes Pending</p>
            <span className="bg-amber-500/80 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalNotesPending}</span>
          </div>
          <div className="p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 flex items-center gap-1.5 p-1.5 rounded-lg bg-violet-50/60 border border-violet-200/30">
                <Brain className="h-4 w-4 text-violet-700 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-violet-800">{notesPending.brainwave}</p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-1.5 p-1.5 rounded-lg bg-blue-50/60 border border-blue-200/30">
                <UltrasoundProbeIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-blue-700">{notesPending.ultrasound}</p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-1.5 p-1.5 rounded-lg bg-red-50/60 border border-red-200/30">
                <Heart className="h-4 w-4 text-red-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-red-700">{notesPending.vitalwave}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Trend - Compact */}
        <div
          className={`${glassCardStyle} flex flex-col cursor-pointer group smoke-fill glass-tile-hover`}
          onClick={handleViewAllBilling}
          data-testid="button-revenue-trend"
        >
          <div className="w-full h-10 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-2 border-b border-white/10">
            <TrendingUp className="h-4 w-4 text-white" />
            <p className="text-white font-bold text-sm drop-shadow-sm">Revenue Trend</p>
          </div>
          <div className="p-3 flex items-center justify-center gap-3">
            <div className="flex items-end gap-1 h-12">
              <div className="w-6 bg-gradient-to-t from-violet-400 to-violet-200 rounded-t" style={{ height: `${Math.max(12, (brainwaveRevenue / Math.max(totalRevenue, 1)) * 48)}px` }}></div>
              <div className="w-6 bg-gradient-to-t from-blue-400 to-blue-200 rounded-t" style={{ height: `${Math.max(12, (ultrasoundRevenue / Math.max(totalRevenue, 1)) * 48)}px` }}></div>
              <div className="w-6 bg-gradient-to-t from-red-400 to-red-200 rounded-t" style={{ height: `${Math.max(12, (vitalwaveRevenue / Math.max(totalRevenue, 1)) * 48)}px` }}></div>
            </div>
            <div className="text-center">
              <p className="text-slate-700 text-sm font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-slate-500 text-xs">Total Revenue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
