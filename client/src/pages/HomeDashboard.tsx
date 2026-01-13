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
  onNavigate?: (tab: "home" | "prescreens" | "ancillary" | "finance" | "schedule" | "billing") => void;
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

  const recentRecords = records.slice(0, 5);

  const handleViewAllBilling = () => {
    if (onNavigate) {
      onNavigate("billing");
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
                <div className="p-2 bg-blue-50 rounded">
                  <p className="text-sm font-semibold text-blue-700">{brainwaveCount}</p>
                  <p className="text-xs text-blue-600">Brainwave</p>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <p className="text-sm font-semibold text-purple-700">{ultrasoundCount}</p>
                  <p className="text-xs text-purple-600">Ultrasound</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded">
                  <p className="text-sm font-semibold text-emerald-700">{vitalwaveCount}</p>
                  <p className="text-xs text-emerald-600">Vitalwave</p>
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Zap className="h-5 w-5 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{brainwaveCount}</p>
                  <p className="text-sm text-blue-600">Brainwave</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Activity className="h-5 w-5 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-purple-700">{ultrasoundCount}</p>
                  <p className="text-sm text-purple-600">Ultrasound</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 mx-auto text-emerald-600 mb-2" />
                  <p className="text-2xl font-bold text-emerald-700">{vitalwaveCount}</p>
                  <p className="text-sm text-emerald-600">Vitalwave</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 mx-auto text-slate-600 mb-2" />
                  <p className="text-2xl font-bold text-slate-700">{totalCount - brainwaveCount - ultrasoundCount - vitalwaveCount}</p>
                  <p className="text-sm text-slate-600">Other</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  {recentRecords.map((record, index) => (
                    <div 
                      key={record.billing_id || index} 
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      data-testid={`card-billing-${record.billing_id || index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {record.patient_name || "Unknown Patient"}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {record.clinician?.replace(/"/g, "") || "Clinician"} • {formatDate(record.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <Badge 
                          variant="outline" 
                          className={
                            record.source_tab?.includes("BRAINWAVE") ? "bg-blue-50 text-blue-700 border-blue-200" :
                            record.source_tab?.includes("ULTRASOUND") ? "bg-purple-50 text-purple-700 border-purple-200" :
                            record.source_tab?.includes("VITALWAVE") ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            "bg-slate-100 text-slate-700 border-slate-200"
                          }
                        >
                          {record.service || "Service"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={handleViewAllBilling}
                data-testid="button-view-billing"
              >
                View All Billing Records
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
