import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, DollarSign, Loader2, AlertTriangle, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface BillingRecord {
  billing_id: string;
  invoice_number?: string;
  patient_name?: string;
  service?: string;
  amount?: number;
  status?: string;
  date?: string;
}

interface BillingResponse {
  ok: boolean;
  data: BillingRecord[];
}

function getStatusColor(status: string | undefined): string {
  if (!status) return "bg-slate-100 text-slate-700";
  const normalized = status.toLowerCase();
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };
  return colors[normalized] || "bg-slate-100 text-slate-700";
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

  const records = billingData?.data || [];
  
  const totalPending = records
    .filter(r => r.status?.toLowerCase() === "pending")
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  
  const totalPaid = records
    .filter(r => r.status?.toLowerCase() === "paid")
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  
  const totalOverdue = records
    .filter(r => r.status?.toLowerCase() === "overdue")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const pendingCount = records.filter(r => r.status?.toLowerCase() === "pending").length;
  const overdueCount = records.filter(r => r.status?.toLowerCase() === "overdue").length;

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
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <Clock className="h-4 w-4 mx-auto text-amber-600 mb-1" />
                    <p className="text-lg font-bold text-amber-700">${totalPending.toLocaleString()}</p>
                    <p className="text-xs text-amber-600">{pendingCount} Pending</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 mx-auto text-green-600 mb-1" />
                    <p className="text-lg font-bold text-green-700">${totalPaid.toLocaleString()}</p>
                    <p className="text-xs text-green-600">Paid</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 mx-auto text-red-600 mb-1" />
                    <p className="text-lg font-bold text-red-700">${totalOverdue.toLocaleString()}</p>
                    <p className="text-xs text-red-600">{overdueCount} Overdue</p>
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
                      {record.service || "Service"} • {record.date || "No date"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="font-semibold text-slate-900">
                      ${(record.amount || 0).toLocaleString()}
                    </span>
                    <Badge className={getStatusColor(record.status)}>
                      {record.status || "Unknown"}
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
