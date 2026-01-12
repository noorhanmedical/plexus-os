import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, User, MapPin, FileText } from "lucide-react";

interface ScheduleAppointment {
  id: string;
  time: string;
  patient: string;
  type: string;
  provider: string;
  location: string;
  status: "scheduled" | "checked-in" | "in-progress" | "completed" | "no-show";
  notes?: string;
}

const mockSchedule: ScheduleAppointment[] = [
  { id: "1", time: "8:00 AM", patient: "John Smith", type: "New Patient Visit", provider: "Dr. Williams", location: "Room 101", status: "completed" },
  { id: "2", time: "8:30 AM", patient: "Maria Garcia", type: "Follow-up", provider: "Dr. Williams", location: "Room 102", status: "completed" },
  { id: "3", time: "9:00 AM", patient: "Robert Johnson", type: "Lab Review", provider: "Dr. Chen", location: "Room 103", status: "in-progress" },
  { id: "4", time: "9:30 AM", patient: "Emily Davis", type: "Annual Physical", provider: "Dr. Williams", location: "Room 101", status: "checked-in" },
  { id: "5", time: "10:00 AM", patient: "Michael Brown", type: "Medication Review", provider: "Dr. Chen", location: "Room 104", status: "scheduled" },
  { id: "6", time: "10:30 AM", patient: "Sarah Wilson", type: "Prescreen", provider: "Dr. Williams", location: "Room 102", status: "scheduled" },
  { id: "7", time: "11:00 AM", patient: "James Taylor", type: "Chronic Care", provider: "Dr. Chen", location: "Room 103", status: "scheduled" },
  { id: "8", time: "11:30 AM", patient: "Linda Martinez", type: "New Patient Visit", provider: "Dr. Williams", location: "Room 101", status: "scheduled" },
  { id: "9", time: "1:00 PM", patient: "David Anderson", type: "Follow-up", provider: "Dr. Chen", location: "Room 104", status: "scheduled" },
  { id: "10", time: "1:30 PM", patient: "Jennifer Thomas", type: "Lab Review", provider: "Dr. Williams", location: "Room 102", status: "scheduled" },
  { id: "11", time: "2:00 PM", patient: "Christopher Lee", type: "Annual Physical", provider: "Dr. Chen", location: "Room 103", status: "scheduled" },
  { id: "12", time: "2:30 PM", patient: "Patricia White", type: "Medication Review", provider: "Dr. Williams", location: "Room 101", status: "scheduled" },
];

export function ScheduleView() {
  const getStatusColor = (status: ScheduleAppointment["status"]) => {
    switch (status) {
      case "completed": return "bg-[#1a3d2e]/40 text-[#4a9a7c] border-[#1a3d2e]";
      case "in-progress": return "bg-[#3d2e1a]/40 text-[#c4a35a] border-[#3d2e1a]";
      case "checked-in": return "bg-slate-600/30 text-slate-300 border-slate-600";
      case "no-show": return "bg-[#3d1a1a]/40 text-[#a35a5a] border-[#3d1a1a]";
      default: return "bg-slate-700/30 text-slate-400 border-slate-700";
    }
  };

  const getStatusLabel = (status: ScheduleAppointment["status"]) => {
    switch (status) {
      case "completed": return "Completed";
      case "in-progress": return "In Progress";
      case "checked-in": return "Checked In";
      case "no-show": return "No Show";
      default: return "Scheduled";
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const completedCount = mockSchedule.filter((a) => a.status === "completed").length;
  const inProgressCount = mockSchedule.filter((a) => a.status === "in-progress").length;
  const upcomingCount = mockSchedule.filter((a) => a.status === "scheduled" || a.status === "checked-in").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[#3d2e1a]/40">
            <Calendar className="h-6 w-6 text-[#c4a35a]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Daily Schedule</h2>
            <p className="text-sm text-muted-foreground">{today}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-[#1a3d2e]/40">
                <FileText className="h-5 w-5 text-[#4a9a7c]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-[#3d2e1a]/40">
                <Clock className="h-5 w-5 text-[#c4a35a]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-slate-700/30">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingCount}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#c4a35a]" />
            Today's Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <div className="space-y-2">
              {mockSchedule.map((appointment) => (
                <div
                  key={appointment.id}
                  data-testid={`appointment-${appointment.id}`}
                  className="p-4 rounded-lg border bg-card hover-elevate"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[70px]">
                        <p className="text-lg font-semibold">{appointment.time}</p>
                      </div>
                      <div className="h-12 w-px bg-border"></div>
                      <div>
                        <p className="font-medium">{appointment.patient}</p>
                        <p className="text-sm text-muted-foreground">{appointment.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-muted-foreground hidden md:block">
                        <div className="flex items-center gap-1 justify-end">
                          <User className="h-3 w-3" />
                          {appointment.provider}
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <MapPin className="h-3 w-3" />
                          {appointment.location}
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(appointment.status)} border`}>
                        {getStatusLabel(appointment.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
