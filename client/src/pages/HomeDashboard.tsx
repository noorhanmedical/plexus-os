import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, DollarSign, Loader2, AlertTriangle, TrendingUp, Zap, Activity, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

// Raw API response format from Plexus Apps Script
interface BillingRecord {
  source_tab?: string;
  date_of_service?: string;
  patient?: string;
  clinician?: string;
  billing_status?: string;
  paid_amount?: string | number;
  insurance_info?: string;
  comments?: string;
  // Normalized fields
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

// Format service type from source_tab (e.g., BILLING_BRAINWAVE → Brainwave)
function formatServiceType(sourceTab: string | undefined): string {
  if (!sourceTab) return "-";
  return sourceTab
    .replace(/^BILLING_/i, "")
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Format date for display
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// Helper to normalize billing record fields
function normalizeBillingRecord(record: BillingRecord): BillingRecord {
  return {
    ...record,
    patient_name: record.patient_name || record.patient,
    date: record.date || record.date_of_service,
    service: record.service || formatServiceType(record.source_tab),
  };
}

export function HomeDashboard() {
  const { data: billingData, isLoading: billingLoading, isError: billingError } = useQuery<BillingResponse>({
    queryKey: ["/api/billing/search"],
    queryFn: async () => {
      const res = await fetch("/api/billing/search");
      if (!res.ok) throw new Error("Failed to fetch billing");
      return res.json();
    },
    staleTime: 60000,
  });

  // Normalize records to handle API field mapping
  const rawRecords = billingData?.rows || [];
  const records = rawRecords.map(normalizeBillingRecord);
  
  // Count records by service type
  const brainwaveCount = rawRecords.filter(r => r.source_tab?.includes("BRAINWAVE")).length;
  const ultrasoundCount = rawRecords.filter(r => r.source_tab?.includes("ULTRASOUND")).length;
  const totalCount = records.length;

  const recentRecords = records.slice(0, 5);

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
              <DollarSign className="h-5 w-5 text-slate-300" />
              Billing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {billingLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : billingError ? (
              <div className="text-center py-6">
                <AlertTriangle className="h-8 w-8 mx-auto text-amber-400 mb-2" />
                <p className="text-sm text-slate-500">Failed to load billing data</p>
              </div>
            ) : records.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No billing records</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Zap className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                    <p className="text-lg font-bold text-blue-700">{brainwaveCount}</p>
                    <p className="text-xs text-blue-600">Brainwave</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Activity className="h-4 w-4 mx-auto text-purple-600 mb-1" />
                    <p className="text-lg font-bold text-purple-700">{ultrasoundCount}</p>
                    <p className="text-xs text-purple-600">Ultrasound</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <BarChart3 className="h-4 w-4 mx-auto text-slate-600 mb-1" />
                    <p className="text-lg font-bold text-slate-700">{totalCount - brainwaveCount - ultrasoundCount}</p>
                    <p className="text-xs text-slate-600">Other</p>
                  </div>
                </div>
                <Link href="/billing">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    data-testid="button-view-billing"
                  >
                    View All Billing
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glow-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
          <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
            <TrendingUp className="h-5 w-5 text-slate-300" />
            Recent Billing Activity
          </CardTitle>
          <Link href="/billing">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-300 hover:text-white hover:bg-white/10"
              data-testid="button-go-to-billing"
            >
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-6">
          {billingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : billingError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 mx-auto text-amber-400 mb-2" />
              <p className="text-slate-500">Failed to load billing activity</p>
            </div>
          ) : recentRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent billing activity</p>
          ) : (
            <div className="space-y-3">
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
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                      {record.service || "Service"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
