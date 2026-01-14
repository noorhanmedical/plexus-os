import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, DollarSign, Loader2, AlertTriangle, Calendar, Clock, TestTube, Brain, Heart } from "lucide-react";
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
  const { data: billingData, isLoading: billingLoading, isError: billingError } = useQuery<BillingResponse>({
    queryKey: ["/api/billing/list"],
    queryFn: async () => {
      const res = await fetch("/api/billing/list?limit=500&cursor=0");
      if (!res.ok) throw new Error("Failed to fetch billing");
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: catalogResponse, isLoading: catalogLoading } = useQuery<CatalogResponse>({
    queryKey: ["/api/ancillary/catalog"],
  });

  const catalogItems = catalogResponse?.data || [];
  const firstAncillaryCode = catalogItems[0]?.ancillary_code || "";

  const { data: ancillaryPatientsData, isLoading: ancillaryLoading, isError: ancillaryError } = useQuery<AncillaryPatientsResponse>({
    queryKey: ["/api/ancillary/patients", firstAncillaryCode],
    queryFn: async () => {
      if (!firstAncillaryCode) return { ok: true, results: [] };
      const res = await fetch(`/api/ancillary/patients?ancillary_code=${firstAncillaryCode}&limit=10`);
      return res.json();
    },
    enabled: !!firstAncillaryCode,
    staleTime: 60000,
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

  const glassCardStyle = "backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-3xl overflow-hidden";
  const glassButtonStyle = "backdrop-blur-md bg-white/60 border border-slate-200/50 transition-all duration-300 rounded-2xl smoke-fill";
  const glassTileStyle = "backdrop-blur-xl bg-white/80 border border-white/40 shadow-xl rounded-3xl smoke-fill";

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

  return (
    <div className="space-y-8 p-4 cross-stitch-bg min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a0a28]">Home Page</h1>
        <p className="text-slate-600 text-sm">Clinical dashboard overview</p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          className={`${glassTileStyle} flex flex-col min-h-[180px] cursor-pointer group`}
          onClick={() => onNavigate?.("schedule")}
          data-testid="button-schedule"
        >
          <div className="w-full h-14 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center border-b border-white/10">
            <p className="text-white font-bold text-lg drop-shadow-sm">Schedule</p>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-200/60 to-violet-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-slate-600 text-sm">Daily appointments</p>
          </div>
        </button>

        <button
          className={`${glassTileStyle} flex flex-col min-h-[180px] cursor-pointer group`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-prescreens"
        >
          <div className="w-full h-14 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center border-b border-white/10">
            <p className="text-white font-bold text-lg drop-shadow-sm">Prescreens</p>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-200/60 to-purple-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Sparkles className="h-8 w-8 text-violet-600" />
            </div>
            <p className="text-slate-600 text-sm">Patient eligibility</p>
          </div>
        </button>

        <button
          className={`${glassTileStyle} flex flex-col min-h-[180px] cursor-pointer group`}
          onClick={handleViewAllBilling}
          data-testid="button-finance"
        >
          <div className="w-full h-14 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center border-b border-white/10">
            <p className="text-white font-bold text-lg drop-shadow-sm">Finance Dashboard</p>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-3 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-200/60 to-purple-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <DollarSign className="h-7 w-7 text-indigo-600" />
            </div>
            {totalRevenue > 0 ? (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full backdrop-blur-sm bg-purple-100/70 text-purple-700 font-semibold border border-purple-200/50">{formatCurrency(brainwaveRevenue)}</span>
                  <span className="px-2 py-1 rounded-full backdrop-blur-sm bg-violet-100/70 text-violet-700 font-semibold border border-violet-200/50">{formatCurrency(ultrasoundRevenue)}</span>
                  <span className="px-2 py-1 rounded-full backdrop-blur-sm bg-indigo-100/70 text-indigo-700 font-semibold border border-indigo-200/50">{formatCurrency(vitalwaveRevenue)}</span>
                </div>
                <p className="text-slate-600 text-xs font-medium">{formatCurrency(totalRevenue)} Total Collected</p>
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
        </button>

        <button
          className={`${glassTileStyle} flex flex-col min-h-[180px] cursor-pointer group`}
          onClick={handleViewAllBilling}
          data-testid="button-billing-overview"
        >
          <div className="w-full h-14 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center border-b border-white/10">
            <p className="text-white font-bold text-lg drop-shadow-sm">Billing Dashboard</p>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="text-center px-3 py-2 rounded-xl backdrop-blur-sm bg-purple-100/50 border border-purple-200/30">
                <p className="text-2xl font-bold text-purple-700">{brainwaveCount}</p>
                <p className="text-xs text-purple-600">Brain</p>
              </div>
              <div className="text-center px-3 py-2 rounded-xl backdrop-blur-sm bg-blue-100/50 border border-blue-200/30">
                <p className="text-2xl font-bold text-blue-700">{ultrasoundCount}</p>
                <p className="text-xs text-blue-600">Ultra</p>
              </div>
              <div className="text-center px-3 py-2 rounded-xl backdrop-blur-sm bg-red-100/50 border border-red-200/30">
                <p className="text-2xl font-bold text-red-700">{vitalwaveCount}</p>
                <p className="text-xs text-red-600">Vital</p>
              </div>
            </div>
            <p className="text-slate-600 text-sm font-medium">{totalCount} Total</p>
          </div>
        </button>
      </div>

      <Card className={`${glassCardStyle} overflow-hidden`}>
        <div className="w-full h-14 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center border-b border-white/10">
          <p className="text-white font-bold text-lg drop-shadow-sm">Ancillary Service Patient Tracker</p>
        </div>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-200/60 to-violet-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                <Clock className="h-7 w-7 text-purple-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Patients due for follow-up services (6mo/12mo)</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-purple-700 hover:bg-purple-50 rounded-xl"
              onClick={() => onNavigate?.("ancillary")}
              data-testid="button-view-all-ancillary"
            >
              View All
            </Button>
          </div>

          {billingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : ancillaryDuePatients.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-200/60 to-violet-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <TestTube className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-slate-600">No patients due for follow-up</p>
              <p className="text-slate-500 text-sm mt-1">All patients are up to date with their services</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ancillaryDuePatients.map((patient, idx) => (
                <div 
                  key={`${patient.name}-${idx}`}
                  className={`${glassButtonStyle} p-4 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-200/60 to-violet-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                      {patient.serviceType === "BrainWave" ? <Brain className="h-5 w-5 text-purple-600" /> :
                       patient.serviceType === "Ultrasound" ? <UltrasoundProbeIcon className="h-5 w-5 text-blue-600" /> :
                       patient.serviceType === "VitalWave" ? <Heart className="h-5 w-5 text-red-600" /> :
                       <UltrasoundProbeIcon className="h-5 w-5 text-blue-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-[#1a0a28]">{patient.name}</p>
                      <p className="text-sm text-slate-600">
                        Last {patient.serviceType}: {formatDate(patient.lastService.toISOString())}
                      </p>
                    </div>
                  </div>
                  <Badge className={patient.dueIn.includes("Overdue") ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
                    {patient.dueIn}
                  </Badge>
                </div>
              ))}
              
              <Button 
                className="w-full bg-[#1a0a28] hover:bg-[#2a1a38] text-white rounded-2xl h-12 text-base font-medium mt-4" 
                onClick={() => onNavigate?.("ancillary")}
                data-testid="button-go-to-ancillary"
              >
                Go to Ancillary Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={`${glassCardStyle} overflow-hidden`}>
        <div className="w-full h-14 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center border-b border-white/10">
          <p className="text-white font-bold text-lg drop-shadow-sm">Billing Overview</p>
        </div>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-200/60 to-purple-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                <DollarSign className="h-7 w-7 text-indigo-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Last 3 patients by service (DOS)</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-purple-700 hover:bg-purple-50 rounded-xl"
              onClick={handleViewAllBilling}
              data-testid="button-view-all-billing"
            >
              View All
            </Button>
          </div>

          {billingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : billingError ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
              <p className="text-slate-600">Failed to load billing data</p>
            </div>
          ) : records.length === 0 ? (
            <p className="text-slate-600 text-center py-12">No billing records</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  className={`${glassButtonStyle} text-left cursor-pointer group overflow-hidden rounded-2xl`}
                  onClick={() => handleNavigateToService("brainwave")}
                  data-testid="button-billing-brainwave"
                >
                  <div className="w-full h-10 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center border-b border-white/10">
                    <p className="text-white font-semibold text-sm drop-shadow-sm">BrainWave</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-200/60 to-violet-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <Badge className="backdrop-blur-sm bg-purple-100/70 text-purple-700 border-purple-200/50">{brainwaveCount} records</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {last3Brainwave.length > 0 ? last3Brainwave.map((r, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-slate-700 truncate max-w-[120px]">{r.patient_name || "Unknown"}</span>
                          <span className="text-slate-600 font-medium">{formatDate(r.date)}</span>
                        </div>
                      )) : <p className="text-sm text-slate-500">No recent records</p>}
                    </div>
                  </div>
                </button>
                
                <button
                  className={`${glassButtonStyle} text-left cursor-pointer group overflow-hidden rounded-2xl`}
                  onClick={() => handleNavigateToService("ultrasound")}
                  data-testid="button-billing-ultrasound"
                >
                  <div className="w-full h-10 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center border-b border-white/10">
                    <p className="text-white font-semibold text-sm drop-shadow-sm">Ultrasound</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-200/60 to-cyan-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                        <UltrasoundProbeIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <Badge className="backdrop-blur-sm bg-blue-100/70 text-blue-700 border-blue-200/50">{ultrasoundCount} records</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {last3Ultrasound.length > 0 ? last3Ultrasound.map((r, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-slate-700 truncate max-w-[120px]">{r.patient_name || "Unknown"}</span>
                          <span className="text-slate-600 font-medium">{formatDate(r.date)}</span>
                        </div>
                      )) : <p className="text-sm text-slate-500">No recent records</p>}
                    </div>
                  </div>
                </button>
                
                <button
                  className={`${glassButtonStyle} text-left cursor-pointer group overflow-hidden rounded-2xl`}
                  onClick={() => handleNavigateToService("vitalwave")}
                  data-testid="button-billing-vitalwave"
                >
                  <div className="w-full h-10 bg-gradient-to-r from-[#1a0a28]/90 via-[#2d1b4e]/85 to-[#1a0a28]/90 backdrop-blur-md flex items-center justify-center border-b border-white/10">
                    <p className="text-white font-semibold text-sm drop-shadow-sm">VitalWave</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-200/60 to-rose-300/60 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                        <Heart className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <Badge className="backdrop-blur-sm bg-red-100/70 text-red-700 border-red-200/50">{vitalwaveCount} records</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {last3Vitalwave.length > 0 ? last3Vitalwave.map((r, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-slate-700 truncate max-w-[120px]">{r.patient_name || "Unknown"}</span>
                          <span className="text-slate-600 font-medium">{formatDate(r.date)}</span>
                        </div>
                      )) : <p className="text-sm text-slate-500">No recent records</p>}
                    </div>
                  </div>
                </button>
              </div>
              
              <Button 
                className="w-full bg-[#1a0a28] hover:bg-[#2a1a38] text-white rounded-2xl h-12 text-base font-medium" 
                onClick={handleViewAllBilling}
                data-testid="button-view-billing"
              >
                Go to Billing Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
