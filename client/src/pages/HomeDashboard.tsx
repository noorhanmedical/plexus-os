import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, DollarSign, Loader2, AlertTriangle, TrendingUp, Zap, Activity, Calendar, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

interface HomeDashboardProps {
  onNavigate?: (tab: "home" | "prescreens" | "ancillary" | "finance" | "schedule" | "billing", serviceFilter?: string) => void;
}

function formatServiceType(sourceTab: string | undefined): string {
  if (!sourceTab) return "-";
  return sourceTab
    .replace(/^BILLING_/i, "")
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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
    service: record.service || formatServiceType(record.source_tab),
  };
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

  const rawRecords = billingData?.rows || [];
  const records = rawRecords.map(normalizeBillingRecord);
  
  const brainwaveCount = rawRecords.filter(r => r.source_tab?.includes("BRAINWAVE")).length;
  const ultrasoundCount = rawRecords.filter(r => r.source_tab?.includes("ULTRASOUND")).length;
  const vitalwaveCount = rawRecords.filter(r => r.source_tab?.includes("VITALWAVE")).length;
  const totalCount = records.length;

  const recentBrainwave = rawRecords.filter(r => r.source_tab?.includes("BRAINWAVE")).slice(0, 2).map(normalizeBillingRecord);
  const recentUltrasound = rawRecords.filter(r => r.source_tab?.includes("ULTRASOUND")).slice(0, 2).map(normalizeBillingRecord);
  const recentVitalwave = rawRecords.filter(r => r.source_tab?.includes("VITALWAVE")).slice(0, 2).map(normalizeBillingRecord);

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

  const glassCardStyle = "backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl rounded-3xl overflow-hidden";
  const glassButtonStyle = "backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/15 transition-all duration-300 rounded-2xl";

  return (
    <div className="space-y-8 p-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          className={`${glassCardStyle} ${glassButtonStyle} p-6 flex flex-col items-center justify-center gap-4 min-h-[160px] cursor-pointer group`}
          onClick={() => onNavigate?.("schedule")}
          data-testid="button-schedule"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/30 to-orange-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Calendar className="h-8 w-8 text-amber-300" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">Schedule</p>
            <p className="text-white/60 text-sm">Daily appointments</p>
          </div>
        </button>

        <button
          className={`${glassCardStyle} ${glassButtonStyle} p-6 flex flex-col items-center justify-center gap-4 min-h-[160px] cursor-pointer group`}
          onClick={() => onNavigate?.("ancillary")}
          data-testid="button-ancillary"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400/30 to-rose-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Heart className="h-8 w-8 text-pink-300" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">Ancillary</p>
            <p className="text-white/60 text-sm">Services & labs</p>
          </div>
        </button>

        <button
          className={`${glassCardStyle} ${glassButtonStyle} p-6 flex flex-col items-center justify-center gap-4 min-h-[160px] cursor-pointer group`}
          onClick={() => onNavigate?.("prescreens")}
          data-testid="button-prescreens"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/30 to-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="h-8 w-8 text-cyan-300" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">Prescreens</p>
            <p className="text-white/60 text-sm">Patient eligibility</p>
          </div>
        </button>

        <button
          className={`${glassCardStyle} ${glassButtonStyle} p-6 flex flex-col items-center justify-center gap-4 min-h-[160px] cursor-pointer group`}
          onClick={handleViewAllBilling}
          data-testid="button-finance"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-teal-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Briefcase className="h-8 w-8 text-emerald-300" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">Finance</p>
            <p className="text-white/60 text-sm">{totalCount} records</p>
          </div>
        </button>
      </div>

      <Card className={`${glassCardStyle}`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400/30 to-purple-500/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-violet-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Billing Overview</h2>
                <p className="text-white/60 text-sm">Recent activity by service</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
              onClick={handleViewAllBilling}
              data-testid="button-view-all-billing"
            >
              View All
            </Button>
          </div>

          {billingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
          ) : billingError ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-400 mb-3" />
              <p className="text-white/60">Failed to load billing data</p>
            </div>
          ) : records.length === 0 ? (
            <p className="text-white/60 text-center py-12">No billing records</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  className={`${glassButtonStyle} p-5 text-left cursor-pointer group`}
                  onClick={() => handleNavigateToService("brainwave")}
                  data-testid="button-billing-brainwave"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400/30 to-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Zap className="h-6 w-6 text-blue-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Brainwave</p>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 mt-1">{brainwaveCount} records</Badge>
                    </div>
                  </div>
                  <div className="space-y-2 pl-1">
                    {recentBrainwave.length > 0 ? recentBrainwave.map((r, i) => (
                      <p key={i} className="text-sm text-white/60 truncate">{r.patient_name || "Unknown"} • {formatDate(r.date)}</p>
                    )) : <p className="text-sm text-white/40">No recent records</p>}
                  </div>
                </button>
                
                <button
                  className={`${glassButtonStyle} p-5 text-left cursor-pointer group`}
                  onClick={() => handleNavigateToService("ultrasound")}
                  data-testid="button-billing-ultrasound"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400/30 to-fuchsia-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Activity className="h-6 w-6 text-purple-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Ultrasound</p>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 mt-1">{ultrasoundCount} records</Badge>
                    </div>
                  </div>
                  <div className="space-y-2 pl-1">
                    {recentUltrasound.length > 0 ? recentUltrasound.map((r, i) => (
                      <p key={i} className="text-sm text-white/60 truncate">{r.patient_name || "Unknown"} • {formatDate(r.date)}</p>
                    )) : <p className="text-sm text-white/40">No recent records</p>}
                  </div>
                </button>
                
                <button
                  className={`${glassButtonStyle} p-5 text-left cursor-pointer group`}
                  onClick={() => handleNavigateToService("vitalwave")}
                  data-testid="button-billing-vitalwave"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/30 to-teal-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="h-6 w-6 text-emerald-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Vitalwave</p>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 mt-1">{vitalwaveCount} records</Badge>
                    </div>
                  </div>
                  <div className="space-y-2 pl-1">
                    {recentVitalwave.length > 0 ? recentVitalwave.map((r, i) => (
                      <p key={i} className="text-sm text-white/60 truncate">{r.patient_name || "Unknown"} • {formatDate(r.date)}</p>
                    )) : <p className="text-sm text-white/40">No recent records</p>}
                  </div>
                </button>
              </div>
              
              <Button 
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl h-12 text-base font-medium backdrop-blur-md" 
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
