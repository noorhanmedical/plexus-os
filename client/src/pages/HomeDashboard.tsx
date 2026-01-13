import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, DollarSign, Loader2, AlertTriangle, TrendingUp, Clock, CheckCircle2, AlertCircle, Users, ClipboardList, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface PrescreenRecord {
  prescreen_id: string;
  patient_uuid: string;
  prescreen_status?: string;
  requested_ancillary_code?: string;
  eligibility_status_final?: string;
  scheduled_datetime?: string;
  location?: string;
}

interface PrescreensResponse {
  ok: boolean;
  data: PrescreenRecord[];
}

export function HomeDashboard() {
  const { data: prescreensData, isLoading: prescreensLoading, isError: prescreensError } = useQuery<PrescreensResponse>({
    queryKey: ["/api/prescreens"],
    queryFn: async () => {
      const res = await fetch("/api/prescreens");
      if (!res.ok) throw new Error("Failed to fetch prescreens");
      return res.json();
    },
    staleTime: 60000,
  });

  const prescreens = (prescreensData?.data || []).filter(p => p.patient_uuid || p.requested_ancillary_code);
  
  const pendingPrescreens = prescreens.filter(p => 
    p.prescreen_status?.toLowerCase() === "pending" || 
    p.prescreen_status?.toLowerCase() === "in progress"
  ).length;
  
  const clearedPrescreens = prescreens.filter(p => 
    p.prescreen_status?.toLowerCase() === "cleared" ||
    p.prescreen_status?.toLowerCase() === "completed"
  ).length;

  const scheduledToday = prescreens.filter(p => {
    if (!p.scheduled_datetime) return false;
    const scheduled = new Date(p.scheduled_datetime);
    const today = new Date();
    return scheduled.toDateString() === today.toDateString();
  }).length;

  const eligibleCount = prescreens.filter(p => 
    p.eligibility_status_final?.toLowerCase() === "eligible"
  ).length;

  const ineligibleCount = prescreens.filter(p => 
    p.eligibility_status_final?.toLowerCase() === "ineligible"
  ).length;

  const recentPrescreens = prescreens.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <Calendar className="h-5 w-5 text-slate-300" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {prescreensLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : prescreensError ? (
              <div className="text-center py-6">
                <AlertTriangle className="h-8 w-8 mx-auto text-amber-400 mb-2" />
                <p className="text-sm text-slate-500">Failed to load schedule</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-700">{scheduledToday}</p>
                  <p className="text-sm text-blue-600">Appointments Today</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-lg font-bold text-slate-700">{pendingPrescreens}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-700">{clearedPrescreens}</p>
                    <p className="text-xs text-green-600">Cleared</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <Heart className="h-5 w-5 text-slate-300" />
              Eligibility Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {prescreensLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : prescreensError ? (
              <div className="text-center py-6">
                <AlertTriangle className="h-8 w-8 mx-auto text-amber-400 mb-2" />
                <p className="text-sm text-slate-500">Failed to load data</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                    <p className="text-2xl font-bold text-green-700">{eligibleCount}</p>
                    <p className="text-xs text-green-600">Eligible</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                    <p className="text-2xl font-bold text-red-700">{ineligibleCount}</p>
                    <p className="text-xs text-red-600">Ineligible</p>
                  </div>
                </div>
                <Link href="/ancillary">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    data-testid="button-view-ancillary"
                  >
                    View Ancillary Services
                  </Button>
                </Link>
              </div>
            )}
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
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <Clock className="h-4 w-4 mx-auto text-amber-600 mb-1" />
                  <p className="text-lg font-bold text-amber-700">$0</p>
                  <p className="text-xs text-amber-600">Pending</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 mx-auto text-green-600 mb-1" />
                  <p className="text-lg font-bold text-green-700">$0</p>
                  <p className="text-xs text-green-600">Paid</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 mx-auto text-red-600 mb-1" />
                  <p className="text-lg font-bold text-red-700">$0</p>
                  <p className="text-xs text-red-600">Overdue</p>
                </div>
              </div>
              <p className="text-xs text-center text-slate-400">Billing API not yet configured in Plexus</p>
              <Link href="/billing">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  data-testid="button-view-billing"
                >
                  View Billing
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glow-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
          <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
            <ClipboardList className="h-5 w-5 text-slate-300" />
            Recent Prescreens
          </CardTitle>
          <Link href="/prescreens">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-300 hover:text-white hover:bg-white/10"
              data-testid="button-go-to-prescreens"
            >
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-6">
          {prescreensLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : prescreensError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 mx-auto text-amber-400 mb-2" />
              <p className="text-slate-500">Failed to load prescreens</p>
            </div>
          ) : recentPrescreens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent prescreens</p>
          ) : (
            <div className="space-y-3">
              {recentPrescreens.map((prescreen, index) => (
                <div 
                  key={prescreen.prescreen_id || prescreen.patient_uuid || index} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  data-testid={`card-prescreen-${prescreen.prescreen_id || prescreen.patient_uuid || index}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {prescreen.requested_ancillary_code || "Service"}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {prescreen.location || "No location"} • {prescreen.scheduled_datetime || "Not scheduled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge className={
                      prescreen.prescreen_status?.toLowerCase() === "cleared" 
                        ? "bg-green-100 text-green-700"
                        : prescreen.prescreen_status?.toLowerCase() === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }>
                      {prescreen.prescreen_status || "Unknown"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <Users className="h-5 w-5 text-slate-300" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-slate-700">{prescreens.length}</p>
                <p className="text-sm text-slate-500">Total Prescreens</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-700">{scheduledToday}</p>
                <p className="text-sm text-blue-600">Scheduled Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <TrendingUp className="h-5 w-5 text-slate-300" />
              Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Pending Review</span>
                <Badge className="bg-amber-100 text-amber-700">{pendingPrescreens}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Cleared Today</span>
                <Badge className="bg-green-100 text-green-700">{clearedPrescreens}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Eligible Patients</span>
                <Badge className="bg-blue-100 text-blue-700">{eligibleCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
