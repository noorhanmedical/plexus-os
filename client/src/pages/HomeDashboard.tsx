import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, DollarSign, Loader2, AlertTriangle, TrendingUp, Zap, Activity, BarChart3, Briefcase } from "lucide-react";
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

  // Get recent records per service type
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <Sparkles className="h-5 w-5 text-slate-300" />
              Daily Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center py-8">No scheduled appointments</p>
          </CardContent>
        </Card>

        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <Heart className="h-5 w-5 text-slate-300" />
              Ancillary Services
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center py-8">No ancillary services pending</p>
          </CardContent>
        </Card>

        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <Briefcase className="h-5 w-5 text-slate-300" />
              Finance Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <button 
                  className="p-2 bg-blue-50 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                  onClick={() => handleNavigateToService("brainwave")}
                  data-testid="button-finance-brainwave"
                >
                  <p className="text-sm font-semibold text-blue-700">{brainwaveCount}</p>
                  <p className="text-xs text-blue-600">Brainwave</p>
                </button>
                <button 
                  className="p-2 bg-purple-50 rounded hover:bg-purple-100 transition-colors cursor-pointer"
                  onClick={() => handleNavigateToService("ultrasound")}
                  data-testid="button-finance-ultrasound"
                >
                  <p className="text-sm font-semibold text-purple-700">{ultrasoundCount}</p>
                  <p className="text-xs text-purple-600">Ultrasound</p>
                </button>
                <button 
                  className="p-2 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                  onClick={() => handleNavigateToService("vitalwave")}
                  data-testid="button-finance-vitalwave"
                >
                  <p className="text-sm font-semibold text-emerald-700">{vitalwaveCount}</p>
                  <p className="text-xs text-emerald-600">Vitalwave</p>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glow-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
          <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
            <DollarSign className="h-5 w-5 text-slate-300" />
            Billing Summary
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-300 hover:text-white hover:bg-white/10"
            onClick={handleViewAllBilling}
            data-testid="button-view-all-billing"
          >
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {billingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : billingError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 mx-auto text-amber-400 mb-2" />
              <p className="text-slate-500">Failed to load billing data</p>
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No billing records</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  className="text-left p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer border border-blue-100"
                  onClick={() => handleNavigateToService("brainwave")}
                  data-testid="button-billing-brainwave"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-700">Brainwave</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">{brainwaveCount}</Badge>
                  </div>
                  <div className="space-y-1">
                    {recentBrainwave.length > 0 ? recentBrainwave.map((r, i) => (
                      <p key={i} className="text-xs text-blue-600 truncate">{r.patient_name || "Unknown"} • {formatDate(r.date)}</p>
                    )) : <p className="text-xs text-blue-400">No recent records</p>}
                  </div>
                </button>
                
                <button
                  className="text-left p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer border border-purple-100"
                  onClick={() => handleNavigateToService("ultrasound")}
                  data-testid="button-billing-ultrasound"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-purple-700">Ultrasound</span>
                    </div>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">{ultrasoundCount}</Badge>
                  </div>
                  <div className="space-y-1">
                    {recentUltrasound.length > 0 ? recentUltrasound.map((r, i) => (
                      <p key={i} className="text-xs text-purple-600 truncate">{r.patient_name || "Unknown"} • {formatDate(r.date)}</p>
                    )) : <p className="text-xs text-purple-400">No recent records</p>}
                  </div>
                </button>
                
                <button
                  className="text-left p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-100"
                  onClick={() => handleNavigateToService("vitalwave")}
                  data-testid="button-billing-vitalwave"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-700">Vitalwave</span>
                    </div>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">{vitalwaveCount}</Badge>
                  </div>
                  <div className="space-y-1">
                    {recentVitalwave.length > 0 ? recentVitalwave.map((r, i) => (
                      <p key={i} className="text-xs text-emerald-600 truncate">{r.patient_name || "Unknown"} • {formatDate(r.date)}</p>
                    )) : <p className="text-xs text-emerald-400">No recent records</p>}
                  </div>
                </button>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4" 
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
