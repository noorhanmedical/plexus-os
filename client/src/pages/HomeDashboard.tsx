import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Prescreen } from "@shared/schema";

interface PrescreensResponse {
  ok: boolean;
  data?: Prescreen[];
  error?: string;
}

interface ScheduleItem {
  id: string;
  patientName: string;
  time: string;
  type: string;
  status: "scheduled" | "in-progress" | "completed";
}

interface AncillaryItem {
  id: string;
  patientName: string;
  service: string;
  status: "completed" | "due-soon" | "overdue";
  dueDate?: string;
  completedDate?: string;
}

export function HomeDashboard() {
  const { data: response } = useQuery<PrescreensResponse>({
    queryKey: ["/api/prescreens?limit=50"],
  });
  
  const prescreens = response?.data || [];

  const todaySchedule: ScheduleItem[] = [
    { id: "1", patientName: "John Smith", time: "9:00 AM", type: "Initial Consult", status: "completed" },
    { id: "2", patientName: "Mary Johnson", time: "10:30 AM", type: "Follow-up", status: "in-progress" },
    { id: "3", patientName: "Robert Davis", time: "11:00 AM", type: "Lab Review", status: "scheduled" },
    { id: "4", patientName: "Sarah Wilson", time: "1:30 PM", type: "Physical Exam", status: "scheduled" },
    { id: "5", patientName: "Michael Brown", time: "3:00 PM", type: "Consultation", status: "scheduled" },
  ];

  const ancillaryItems: AncillaryItem[] = [
    { id: "1", patientName: "John Smith", service: "Blood Work", status: "completed", completedDate: "Jan 10, 2026" },
    { id: "2", patientName: "Mary Johnson", service: "MRI Scan", status: "due-soon", dueDate: "Jan 15, 2026" },
    { id: "3", patientName: "Robert Davis", service: "X-Ray", status: "overdue", dueDate: "Jan 8, 2026" },
    { id: "4", patientName: "Sarah Wilson", service: "ECG", status: "completed", completedDate: "Jan 11, 2026" },
    { id: "5", patientName: "Michael Brown", service: "Ultrasound", status: "due-soon", dueDate: "Jan 18, 2026" },
  ];

  const financeSummary = {
    todayRevenue: 12450,
    pendingClaims: 8,
    approvedClaims: 23,
    totalOutstanding: 45200,
  };

  const getStatusColor = (status: ScheduleItem["status"]) => {
    switch (status) {
      case "completed": return "bg-[#1a3d2e]/40 text-[#4a9a7c] border-[#1a3d2e]";
      case "in-progress": return "bg-[#3d2e1a]/40 text-[#c4a35a] border-[#3d2e1a]";
      case "scheduled": return "bg-slate-700/30 text-slate-400 border-slate-700";
    }
  };

  const getAncillaryStatusColor = (status: AncillaryItem["status"]) => {
    switch (status) {
      case "completed": return "bg-[#1a3d2e]/40 text-[#4a9a7c] border-[#1a3d2e]";
      case "due-soon": return "bg-[#3d2e1a]/40 text-[#c4a35a] border-[#3d2e1a]";
      case "overdue": return "bg-[#3d1a1a]/40 text-[#a35a5a] border-[#3d1a1a]";
    }
  };

  const getScheduleRowStyle = (status: ScheduleItem["status"]) => {
    switch (status) {
      case "completed": return "bg-[#1a3d2e]/50 border border-[#4a9a7c]/50 backdrop-blur-sm";
      case "in-progress": return "bg-[#3d2e1a]/50 border border-[#c4a35a]/50 backdrop-blur-sm";
      case "scheduled": return "bg-slate-700/50 border border-slate-500/50 backdrop-blur-sm";
    }
  };

  const getAncillaryRowStyle = (status: AncillaryItem["status"]) => {
    switch (status) {
      case "completed": return "bg-[#1a3d2e]/50 border border-[#4a9a7c]/50 backdrop-blur-sm";
      case "due-soon": return "bg-[#3d2e1a]/50 border border-[#c4a35a]/50 backdrop-blur-sm";
      case "overdue": return "bg-[#3d1a1a]/50 border border-[#a35a5a]/50 backdrop-blur-sm";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Daily Schedule
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {todaySchedule.length} appointments
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaySchedule.map((item) => (
              <div
                key={item.id}
                data-testid={`schedule-item-${item.id}`}
                className={`flex items-center justify-between p-3 rounded-lg transition-all hover:scale-[1.01] cursor-pointer ${getScheduleRowStyle(item.status)}`}
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm text-white">{item.patientName}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Clock className="h-3 w-3" />
                    <span>{item.time}</span>
                    <span>-</span>
                    <span>{item.type}</span>
                  </div>
                </div>
                <Badge className={getStatusColor(item.status)}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" />
              Ancillary Services
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {ancillaryItems.filter(i => i.status === "overdue").length} overdue
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {ancillaryItems.map((item) => (
              <div
                key={item.id}
                data-testid={`ancillary-item-${item.id}`}
                className={`flex items-center justify-between p-3 rounded-lg transition-all hover:scale-[1.01] cursor-pointer ${getAncillaryRowStyle(item.status)}`}
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm text-white">{item.patientName}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    {item.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 text-[#6fcf97]" />
                    ) : item.status === "overdue" ? (
                      <AlertCircle className="h-3 w-3 text-[#eb5757]" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-[#f2c94c]" />
                    )}
                    <span>{item.service}</span>
                    <span>-</span>
                    <span>
                      {item.status === "completed" ? item.completedDate : `Due: ${item.dueDate}`}
                    </span>
                  </div>
                </div>
                <Badge className={getAncillaryStatusColor(item.status)}>
                  {item.status.replace("-", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-chart-4" />
              Finance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[#1a3d2e]/50 border border-[#4a9a7c]/50 backdrop-blur-sm space-y-1 transition-all hover:scale-[1.02] cursor-pointer">
                <p className="text-xs text-slate-300">Today's Revenue</p>
                <p className="text-2xl font-bold text-[#6fcf97]">
                  ${financeSummary.todayRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#3d2e1a]/50 border border-[#c4a35a]/50 backdrop-blur-sm space-y-1 transition-all hover:scale-[1.02] cursor-pointer">
                <p className="text-xs text-slate-300">Pending Claims</p>
                <p className="text-2xl font-bold text-[#f2c94c]">
                  {financeSummary.pendingClaims}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#1a3d2e]/50 border border-[#4a9a7c]/50 backdrop-blur-sm space-y-1 transition-all hover:scale-[1.02] cursor-pointer">
                <p className="text-xs text-slate-300">Approved Claims</p>
                <p className="text-2xl font-bold text-[#6fcf97]">
                  {financeSummary.approvedClaims}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#3d1a1a]/50 border border-[#a35a5a]/50 backdrop-blur-sm space-y-1 transition-all hover:scale-[1.02] cursor-pointer">
                <p className="text-xs text-slate-300">Outstanding</p>
                <p className="text-2xl font-bold text-[#eb5757]">
                  ${financeSummary.totalOutstanding.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-500/50 backdrop-blur-sm">
              <p className="text-sm font-medium text-white">Quick Stats</p>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-slate-300">Collection Rate</span>
                <span className="font-medium text-[#6fcf97]">94.2%</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-sm">
                <span className="text-slate-300">Avg Days to Pay</span>
                <span className="font-medium text-white">18 days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-muted-foreground text-sm">
        {prescreens?.length ? `${prescreens.length} prescreens loaded from API` : "Loading prescreens..."}
      </div>
    </div>
  );
}
