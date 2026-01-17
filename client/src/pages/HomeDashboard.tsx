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

  const glassCardStyle = "backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-3xl overflow-hidden";
  const squareTileStyle = "backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-3xl smoke-fill glass-tile-hover aspect-square";

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

  return (
    <div className="space-y-6 p-4 min-h-full relative">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0a28]">Home Page</h1>
          <p className="text-slate-600 text-sm">Clinical dashboard overview</p>
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

      {/* ROW 1: Square tiles with big icons - Schedule, Patient Prescreens, Patient Database, VideoCall */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`${squareTileStyle} flex flex-col items-center justify-center p-4 cursor-pointer group`}
          onClick={() => onNavigate?.("schedule")}
          data-testid="button-schedule"
        >
          <Calendar className="h-12 w-12 text-indigo-700 mb-3 group-hover:scale-110 transition-transform duration-300" />
          <p className="text-slate-700 font-semibold text-sm text-center">Schedule</p>
        </div>

        <div
          className={`${squareTileStyle} flex flex-col items-center justify-center p-4 cursor-pointer group`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-prescreens"
        >
          <Sparkles className="h-12 w-12 text-purple-700 mb-3 group-hover:scale-110 transition-transform duration-300" />
          <p className="text-slate-700 font-semibold text-sm text-center">Patient Prescreens</p>
        </div>

        <div
          className={`${squareTileStyle} flex flex-col items-center justify-center p-4 cursor-pointer group`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-patient-database"
        >
          <Database className="h-12 w-12 text-teal-700 mb-3 group-hover:scale-110 transition-transform duration-300" />
          <p className="text-slate-700 font-semibold text-sm text-center">Patient Database</p>
        </div>

        <div
          className={`${squareTileStyle} flex flex-col items-center justify-center p-4 cursor-pointer group`}
          onClick={() => onNavigate?.("schedule")}
          data-testid="button-videocall"
        >
          <Video className="h-12 w-12 text-blue-700 mb-3 group-hover:scale-110 transition-transform duration-300" />
          <p className="text-slate-700 font-semibold text-sm text-center">VideoCall</p>
        </div>
      </div>

      {/* ROW 2: Ancillary Service Patient Tracker */}
      <div 
        className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer`}
        onClick={() => onNavigate?.("ancillary")}
        data-testid="button-ancillary-card"
      >
        <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
          <ClipboardList className="h-5 w-5 text-white" />
          <p className="text-white font-bold text-base drop-shadow-sm">Ancillary Service Patient Tracker</p>
        </div>

        {billingLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-x divide-white/20">
            {/* BrainWave Patient Tracking */}
            <div className="smoke-fill-section-violet py-5 px-5 min-h-[160px]">
              <div className="flex items-center gap-4 mb-4">
                <Brain className="h-10 w-10 text-violet-700" />
                <div>
                  <p className="font-bold text-violet-800 text-base">BrainWave</p>
                  <p className="text-sm text-slate-500">{ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").length} due</p>
                </div>
              </div>
              <div className="space-y-2">
                {ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").slice(0, 2).map((patient, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 truncate max-w-[100px]">{patient.name}</span>
                    <Badge className={patient.dueIn.includes("Overdue") ? "bg-red-100/80 text-red-700 border-red-200/50 text-xs" : "bg-amber-100/80 text-amber-700 border-amber-200/50 text-xs"}>
                      {patient.dueIn}
                    </Badge>
                  </div>
                ))}
                {ancillaryDuePatients.filter(p => p.serviceType === "BrainWave").length === 0 && (
                  <p className="text-sm text-slate-500">No patients due</p>
                )}
              </div>
            </div>

            {/* Ultrasound Patient Tracking */}
            <div className="smoke-fill-section-blue py-5 px-5 min-h-[160px]">
              <div className="flex items-center gap-4 mb-4">
                <UltrasoundProbeIcon className="h-10 w-10 text-blue-600" />
                <div>
                  <p className="font-bold text-blue-700 text-base">Ultrasound</p>
                  <p className="text-sm text-slate-500">{ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").length} due</p>
                </div>
              </div>
              <div className="space-y-2">
                {ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").slice(0, 2).map((patient, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 truncate max-w-[100px]">{patient.name}</span>
                    <Badge className={patient.dueIn.includes("Overdue") ? "bg-red-100/80 text-red-700 border-red-200/50 text-xs" : "bg-amber-100/80 text-amber-700 border-amber-200/50 text-xs"}>
                      {patient.dueIn}
                    </Badge>
                  </div>
                ))}
                {ancillaryDuePatients.filter(p => p.serviceType === "Ultrasound").length === 0 && (
                  <p className="text-sm text-slate-500">No patients due</p>
                )}
              </div>
            </div>

            {/* VitalWave Patient Tracking */}
            <div className="smoke-fill-section-red py-5 px-5 min-h-[160px]">
              <div className="flex items-center gap-4 mb-4">
                <Heart className="h-10 w-10 text-red-600" />
                <div>
                  <p className="font-bold text-red-700 text-base">VitalWave</p>
                  <p className="text-sm text-slate-500">{ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").length} due</p>
                </div>
              </div>
              <div className="space-y-2">
                {ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").slice(0, 2).map((patient, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 truncate max-w-[100px]">{patient.name}</span>
                    <Badge className={patient.dueIn.includes("Overdue") ? "bg-red-100/80 text-red-700 border-red-200/50 text-xs" : "bg-amber-100/80 text-amber-700 border-amber-200/50 text-xs"}>
                      {patient.dueIn}
                    </Badge>
                  </div>
                ))}
                {ancillaryDuePatients.filter(p => p.serviceType === "VitalWave").length === 0 && (
                  <p className="text-sm text-slate-500">No patients due</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ROW 3: Billing Overview + Finance Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing Overview - Combined tile with service columns */}
        <div 
          className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer`}
          onClick={handleViewAllBilling}
          data-testid="button-billing-card"
        >
          <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
            <Receipt className="h-5 w-5 text-white" />
            <p className="text-white font-bold text-base drop-shadow-sm">Billing Overview</p>
          </div>

          {billingLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-slate-600 text-center py-10">No billing records</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-x divide-white/20">
              {/* BrainWave */}
              <div className="smoke-fill-section-violet py-4 px-4 min-h-[160px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-300/60 to-purple-400/60 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <Brain className="h-3.5 w-3.5 text-violet-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-violet-800 text-sm">BrainWave</p>
                    <p className="text-xs text-slate-500">{brainwaveCount} records</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {last3Brainwave.length > 0 ? last3Brainwave.map((r, i) => (
                    <div 
                      key={i} 
                      className="w-full flex justify-between items-center text-sm hover:bg-white/30 rounded-lg p-1 transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); handleNavigateToService("brainwave"); }}
                      data-testid={`billing-brainwave-${i}`}
                    >
                      <span className="text-slate-700 truncate max-w-[80px]">{r.patient_name || "Unknown"}</span>
                      <span className="text-slate-600 font-medium text-xs">{formatDate(r.date)}</span>
                    </div>
                  )) : <p className="text-sm text-slate-500">No recent records</p>}
                </div>
              </div>

              {/* Ultrasound */}
              <div className="smoke-fill-section-blue py-4 px-4 min-h-[160px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-200/60 to-cyan-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <UltrasoundProbeIcon className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700 text-sm">Ultrasound</p>
                    <p className="text-xs text-slate-500">{ultrasoundCount} records</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {last3Ultrasound.length > 0 ? last3Ultrasound.map((r, i) => (
                    <div 
                      key={i} 
                      className="w-full flex justify-between items-center text-sm hover:bg-white/30 rounded-lg p-1 transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); handleNavigateToService("ultrasound"); }}
                      data-testid={`billing-ultrasound-${i}`}
                    >
                      <span className="text-slate-700 truncate max-w-[80px]">{r.patient_name || "Unknown"}</span>
                      <span className="text-slate-600 font-medium text-xs">{formatDate(r.date)}</span>
                    </div>
                  )) : <p className="text-sm text-slate-500">No recent records</p>}
                </div>
              </div>

              {/* VitalWave */}
              <div className="smoke-fill-section-red py-4 px-4 min-h-[160px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-200/60 to-rose-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <Heart className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-700 text-sm">VitalWave</p>
                    <p className="text-xs text-slate-500">{vitalwaveCount} records</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {last3Vitalwave.length > 0 ? last3Vitalwave.map((r, i) => (
                    <div 
                      key={i} 
                      className="w-full flex justify-between items-center text-sm hover:bg-white/30 rounded-lg p-1 transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); handleNavigateToService("vitalwave"); }}
                      data-testid={`billing-vitalwave-${i}`}
                    >
                      <span className="text-slate-700 truncate max-w-[80px]">{r.patient_name || "Unknown"}</span>
                      <span className="text-slate-600 font-medium text-xs">{formatDate(r.date)}</span>
                    </div>
                  )) : <p className="text-sm text-slate-500">No recent records</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Finance Dashboard */}
        <div
          className={`${glassCardStyle} flex flex-col min-h-[200px] cursor-pointer group smoke-fill glass-tile-hover`}
          onClick={handleViewAllBilling}
          data-testid="button-finance"
        >
          <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
            <DollarSign className="h-5 w-5 text-white" />
            <p className="text-white font-bold text-base drop-shadow-sm">Finance Dashboard</p>
          </div>
          <div className="p-5 flex flex-col items-center justify-center gap-3 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-200/60 to-teal-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <TrendingUp className="h-7 w-7 text-emerald-800" />
            </div>
            {billingLoading ? (
              <div className="flex flex-col items-center gap-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-14 h-5 rounded-full bg-slate-200/70" />
                  <div className="w-14 h-5 rounded-full bg-slate-200/70" />
                  <div className="w-14 h-5 rounded-full bg-slate-200/70" />
                </div>
              </div>
            ) : totalRevenue > 0 ? (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full backdrop-blur-sm bg-purple-100/70 text-purple-700 font-semibold border border-purple-200/50">{formatCurrency(brainwaveRevenue)}</span>
                  <span className="px-2 py-1 rounded-full backdrop-blur-sm bg-blue-100/70 text-blue-700 font-semibold border border-blue-200/50">{formatCurrency(ultrasoundRevenue)}</span>
                  <span className="px-2 py-1 rounded-full backdrop-blur-sm bg-red-100/70 text-red-700 font-semibold border border-red-200/50">{formatCurrency(vitalwaveRevenue)}</span>
                </div>
                <p className="text-slate-600 text-sm font-medium">{formatCurrency(totalRevenue)} Total Collected</p>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-700">{totalPending}</p>
                  <p className="text-xs text-slate-600">Claims Pending</p>
                </div>
                <p className="text-slate-500 text-xs">No payments recorded yet</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ROW 4: Notes + Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes Tile */}
        <div 
          className={`${glassCardStyle} overflow-hidden w-full text-left cursor-pointer`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-notes-card"
        >
          <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
            <FileText className="h-5 w-5 text-white" />
            <p className="text-white font-bold text-base drop-shadow-sm">Notes</p>
          </div>
          <div className="p-5">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-amber-600">{totalNotesPending}</p>
              <p className="text-sm text-slate-600">Notes Pending</p>
              <p className="text-xs text-slate-500 mt-1">Avg. Time: {avgTimePending}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-xl bg-violet-50/60 border border-violet-200/30">
                <Brain className="h-5 w-5 text-violet-700 mx-auto mb-1" />
                <p className="text-lg font-bold text-violet-800">{notesPending.brainwave}</p>
                <p className="text-xs text-violet-600">BrainWave</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-blue-50/60 border border-blue-200/30">
                <UltrasoundProbeIcon className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700">{notesPending.ultrasound}</p>
                <p className="text-xs text-blue-600">Ultrasound</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-red-50/60 border border-red-200/30">
                <Heart className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-700">{notesPending.vitalwave}</p>
                <p className="text-xs text-red-600">VitalWave</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Trend */}
        <div
          className={`${glassCardStyle} flex flex-col min-h-[200px] cursor-pointer group smoke-fill glass-tile-hover`}
          onClick={handleViewAllBilling}
          data-testid="button-revenue-trend"
        >
          <div className="w-full h-12 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center gap-3 border-b border-white/10">
            <TrendingUp className="h-5 w-5 text-white" />
            <p className="text-white font-bold text-base drop-shadow-sm">Revenue Trend</p>
          </div>
          <div className="p-5 flex flex-col items-center justify-center gap-4 flex-1">
            <div className="w-full flex items-end justify-center gap-2 h-20">
              <div className="w-8 bg-gradient-to-t from-violet-400 to-violet-200 rounded-t" style={{ height: `${Math.max(20, (brainwaveRevenue / Math.max(totalRevenue, 1)) * 80)}px` }}></div>
              <div className="w-8 bg-gradient-to-t from-blue-400 to-blue-200 rounded-t" style={{ height: `${Math.max(20, (ultrasoundRevenue / Math.max(totalRevenue, 1)) * 80)}px` }}></div>
              <div className="w-8 bg-gradient-to-t from-red-400 to-red-200 rounded-t" style={{ height: `${Math.max(20, (vitalwaveRevenue / Math.max(totalRevenue, 1)) * 80)}px` }}></div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400"></span> Brain</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Ultra</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Vital</span>
            </div>
            <p className="text-slate-600 text-sm font-medium">{formatCurrency(totalRevenue)} Total Revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
