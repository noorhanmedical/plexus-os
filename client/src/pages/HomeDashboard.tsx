import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, DollarSign, Loader2, AlertTriangle, Calendar, Clock, TestTube, User, Brain, Heart } from "lucide-react";
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
  const glassButtonStyle = "backdrop-blur-md bg-white/60 border border-slate-200/50 hover:bg-white/90 transition-all duration-300 rounded-2xl";

  return (
    <div className="space-y-8 p-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          className={`${glassCardStyle} ${glassButtonStyle} p-6 flex flex-col items-center justify-center gap-4 min-h-[180px] cursor-pointer group`}
          onClick={() => onNavigate?.("schedule")}
          data-testid="button-schedule"
        >
          <p className="text-[#1a0a28] font-bold text-lg">Schedule</p>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Calendar className="h-8 w-8 text-amber-600" />
          </div>
          <p className="text-slate-600 text-sm">Daily appointments</p>
        </button>

        <button
          className={`${glassCardStyle} ${glassButtonStyle} p-6 flex flex-col items-center justify-center gap-4 min-h-[180px] cursor-pointer group`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-prescreens"
        >
          <p className="text-[#1a0a28] font-bold text-lg">Prescreens</p>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="h-8 w-8 text-cyan-600" />
          </div>
          <p className="text-slate-600 text-sm">Patient eligibility</p>
        </button>

        <button
          className={`${glassCardStyle} ${glassButtonStyle} p-6 flex flex-col items-center justify-center gap-3 min-h-[180px] cursor-pointer group`}
          onClick={handleViewAllBilling}
          data-testid="button-finance"
        >
          <p className="text-[#1a0a28] font-bold text-lg">Finance</p>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <DollarSign className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">{brainwaveCount}</span>
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">{ultrasoundCount}</span>
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">{vitalwaveCount}</span>
          </div>
          <p className="text-slate-600 text-xs font-medium">{totalCount} Total</p>
        </button>

        <button
          className={`${glassCardStyle} ${glassButtonStyle} p-6 flex flex-col items-center justify-center gap-3 min-h-[180px] cursor-pointer group`}
          onClick={handleViewAllBilling}
          data-testid="button-billing-overview"
        >
          <p className="text-[#1a0a28] font-bold text-lg">Billing</p>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-700">{brainwaveCount}</p>
              <p className="text-xs text-slate-600">Brain</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">{ultrasoundCount}</p>
              <p className="text-xs text-slate-600">Ultra</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-700">{vitalwaveCount}</p>
              <p className="text-xs text-slate-600">Vital</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm font-medium">{totalCount} Total</p>
        </button>
      </div>

      <Card className={`${glassCardStyle}`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
                <Clock className="h-7 w-7 text-pink-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1a0a28]">Ancillary Service Timelines</h2>
                <p className="text-slate-600 text-sm">Patient test schedules & status</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#1a0a28] hover:bg-slate-100 rounded-xl"
              onClick={() => onNavigate?.("ancillary")}
              data-testid="button-view-all-ancillary"
            >
              View All
            </Button>
          </div>

          {catalogLoading || ancillaryLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : ancillaryError ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
              <p className="text-slate-600">Failed to load ancillary data</p>
            </div>
          ) : ancillaryPatients.length === 0 ? (
            <div className="text-center py-12">
              <TestTube className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600">No ancillary patients found</p>
              <p className="text-slate-500 text-sm mt-1">Select a service in the Ancillary dashboard</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ancillaryPatients.slice(0, 5).map((patient, idx) => (
                <div 
                  key={patient.patient_uuid || idx}
                  className={`${glassButtonStyle} p-4 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1a0a28]">{patient.first_name} {patient.last_name}</p>
                      <p className="text-sm text-slate-600">
                        {patient.mrn && <span className="mr-2">MRN: {patient.mrn}</span>}
                        {patient.eligibility_reason && <span>{patient.eligibility_reason}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {patient.scheduled_date && (
                      <span className="text-sm text-slate-600">{formatDate(patient.scheduled_date)}</span>
                    )}
                    <Badge className={getStatusColor(patient.status)}>
                      {patient.status || "Pending"}
                    </Badge>
                  </div>
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

      <Card className={`${glassCardStyle}`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1a0a28]">Billing Overview</h2>
                <p className="text-slate-600 text-sm">Last 3 patients by service (DOS)</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#1a0a28] hover:bg-slate-100 rounded-xl"
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
                  className={`${glassButtonStyle} p-5 text-left cursor-pointer group`}
                  onClick={() => handleNavigateToService("brainwave")}
                  data-testid="button-billing-brainwave"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-violet-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Brain className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#1a0a28]">BrainWave</p>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">{brainwaveCount} records</Badge>
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
                </button>
                
                <button
                  className={`${glassButtonStyle} p-5 text-left cursor-pointer group`}
                  onClick={() => handleNavigateToService("ultrasound")}
                  data-testid="button-billing-ultrasound"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <UltrasoundProbeIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#1a0a28]">Ultrasound</p>
                      <Badge className="bg-green-100 text-green-700 border-green-200">{ultrasoundCount} records</Badge>
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
                </button>
                
                <button
                  className={`${glassButtonStyle} p-5 text-left cursor-pointer group`}
                  onClick={() => handleNavigateToService("vitalwave")}
                  data-testid="button-billing-vitalwave"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-rose-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Heart className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#1a0a28]">VitalWave</p>
                      <Badge className="bg-red-100 text-red-700 border-red-200">{vitalwaveCount} records</Badge>
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
