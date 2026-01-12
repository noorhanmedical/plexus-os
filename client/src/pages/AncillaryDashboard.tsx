import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, CheckCircle2, Clock, AlertTriangle, Calendar } from "lucide-react";

interface AncillaryService {
  id: string;
  patientName: string;
  patientId: string;
  serviceName: string;
  serviceCode: string;
  status: "completed" | "scheduled" | "due-soon" | "overdue";
  completedDate?: string;
  scheduledDate?: string;
  nextDueDate?: string;
  notes?: string;
}

const ancillaryServices: AncillaryService[] = [
  { id: "1", patientName: "John Smith", patientId: "P001", serviceName: "Complete Blood Count", serviceCode: "CBC", status: "completed", completedDate: "Jan 10, 2026", nextDueDate: "Apr 10, 2026" },
  { id: "2", patientName: "Mary Johnson", patientId: "P002", serviceName: "MRI Brain", serviceCode: "MRI-B", status: "scheduled", scheduledDate: "Jan 15, 2026" },
  { id: "3", patientName: "Robert Davis", patientId: "P003", serviceName: "Chest X-Ray", serviceCode: "XR-CH", status: "overdue", scheduledDate: "Jan 8, 2026" },
  { id: "4", patientName: "Sarah Wilson", patientId: "P004", serviceName: "ECG", serviceCode: "ECG", status: "completed", completedDate: "Jan 11, 2026", nextDueDate: "Jul 11, 2026" },
  { id: "5", patientName: "Michael Brown", patientId: "P005", serviceName: "Liver Function Panel", serviceCode: "LFP", status: "due-soon", nextDueDate: "Jan 14, 2026" },
  { id: "6", patientName: "Emily Chen", patientId: "P006", serviceName: "Ultrasound Abdomen", serviceCode: "US-AB", status: "scheduled", scheduledDate: "Jan 20, 2026" },
  { id: "7", patientName: "James Williams", patientId: "P007", serviceName: "Thyroid Panel", serviceCode: "THY", status: "completed", completedDate: "Jan 9, 2026", nextDueDate: "Mar 9, 2026" },
  { id: "8", patientName: "Lisa Anderson", patientId: "P008", serviceName: "Urinalysis", serviceCode: "UA", status: "overdue", scheduledDate: "Jan 5, 2026" },
  { id: "9", patientName: "David Martinez", patientId: "P009", serviceName: "Lipid Panel", serviceCode: "LIP", status: "due-soon", nextDueDate: "Jan 16, 2026" },
  { id: "10", patientName: "Jennifer Taylor", patientId: "P010", serviceName: "HbA1c", serviceCode: "HBA1C", status: "completed", completedDate: "Jan 12, 2026", nextDueDate: "Apr 12, 2026" },
];

const getStatusIcon = (status: AncillaryService["status"]) => {
  switch (status) {
    case "completed": return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case "scheduled": return <Calendar className="h-4 w-4 text-blue-400" />;
    case "due-soon": return <Clock className="h-4 w-4 text-yellow-400" />;
    case "overdue": return <AlertTriangle className="h-4 w-4 text-red-400" />;
  }
};

const getStatusBadge = (status: AncillaryService["status"]) => {
  switch (status) {
    case "completed": return "bg-green-500/20 text-green-400";
    case "scheduled": return "bg-blue-500/20 text-blue-400";
    case "due-soon": return "bg-yellow-500/20 text-yellow-400";
    case "overdue": return "bg-red-500/20 text-red-400";
  }
};

function ServiceList({ services }: { services: AncillaryService[] }) {
  return (
    <ScrollArea className="h-[calc(100vh-20rem)]">
      <div className="space-y-2">
        {services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No services in this category
          </div>
        ) : (
          services.map((service) => (
            <div
              key={service.id}
              data-testid={`ancillary-service-${service.id}`}
              className="p-4 rounded-lg bg-muted/50 hover-elevate space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium">{service.patientName}</p>
                    <p className="text-xs text-muted-foreground">{service.patientId}</p>
                  </div>
                </div>
                <Badge className={getStatusBadge(service.status)}>
                  {service.status.replace("-", " ")}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {service.serviceCode}
                  </Badge>
                  <span>{service.serviceName}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {service.status === "completed" && service.completedDate && (
                    <>Completed: {service.completedDate}</>
                  )}
                  {service.status === "scheduled" && service.scheduledDate && (
                    <>Scheduled: {service.scheduledDate}</>
                  )}
                  {service.status === "due-soon" && service.nextDueDate && (
                    <>Due: {service.nextDueDate}</>
                  )}
                  {service.status === "overdue" && service.scheduledDate && (
                    <>Was due: {service.scheduledDate}</>
                  )}
                </span>
              </div>
              {service.nextDueDate && service.status === "completed" && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Next due: {service.nextDueDate}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

export function AncillaryDashboard() {
  const completedServices = ancillaryServices.filter(s => s.status === "completed");
  const scheduledServices = ancillaryServices.filter(s => s.status === "scheduled");
  const dueSoonServices = ancillaryServices.filter(s => s.status === "due-soon");
  const overdueServices = ancillaryServices.filter(s => s.status === "overdue");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glow-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedServices.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glow-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledServices.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glow-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-yellow-500/20">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dueSoonServices.length}</p>
                <p className="text-sm text-muted-foreground">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glow-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueServices.length}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Ancillary Services Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({ancillaryServices.length})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">
                Completed
              </TabsTrigger>
              <TabsTrigger value="scheduled" data-testid="tab-scheduled">
                Scheduled
              </TabsTrigger>
              <TabsTrigger value="due-soon" data-testid="tab-due-soon">
                Due Soon
              </TabsTrigger>
              <TabsTrigger value="overdue" data-testid="tab-overdue">
                Overdue
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <ServiceList services={ancillaryServices} />
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              <ServiceList services={completedServices} />
            </TabsContent>
            <TabsContent value="scheduled" className="mt-4">
              <ServiceList services={scheduledServices} />
            </TabsContent>
            <TabsContent value="due-soon" className="mt-4">
              <ServiceList services={dueSoonServices} />
            </TabsContent>
            <TabsContent value="overdue" className="mt-4">
              <ServiceList services={overdueServices} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
