import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Phone, 
  PhoneCall, 
  PhoneMissed, 
  PhoneOff, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Search, 
  Calendar, 
  MessageSquare, 
  Filter, 
  RefreshCw, 
  ChevronRight, 
  Timer, 
  Loader2, 
  Send, 
  Volume2,
  VolumeX
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface OutreachPatient {
  patient_uuid: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  reason: string;
  service_codes: string[];
  priority: "high" | "medium" | "low";
  last_contact_attempt?: string;
  contact_attempts: number;
  status: "pending" | "in_progress" | "scheduled" | "declined" | "no_answer" | "callback";
  notes?: string;
  assigned_to?: string;
  created_at: string;
}

interface PatientData {
  patient_uuid: string;
  first_name: string;
  last_name: string;
  dob?: string;
  phone?: string;
  email?: string;
}

interface OutreachCenterProps {
  onNavigate?: (tab: string, data?: any) => void;
  onPatientSelect?: (patient: PatientData) => void;
}

const glassStyle = "bg-card border border-border shadow-xl dark:backdrop-blur-xl dark:bg-gradient-to-br dark:from-slate-800/90 dark:via-slate-850/85 dark:to-slate-900/90 dark:border-slate-700/50";

const priorityColors = {
  high: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30",
  medium: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground border-border", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30", icon: PhoneCall },
  scheduled: { label: "Scheduled", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  declined: { label: "Declined", color: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30", icon: PhoneOff },
  no_answer: { label: "No Answer", color: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30", icon: PhoneMissed },
  callback: { label: "Callback Requested", color: "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30", icon: Phone },
};

export function OutreachCenter({ onNavigate, onPatientSelect }: OutreachCenterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<OutreachPatient | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [isOnCall, setIsOnCall] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const { toast } = useToast();

  const { data: queueData, isLoading, refetch } = useQuery<{ ok: boolean; data: OutreachPatient[] }>({
    queryKey: ["/api/local/outreach-queue"],
  });

  const queue = queueData?.data || [];

  const filteredQueue = useMemo(() => {
    return queue.filter(patient => {
      const matchesSearch = searchTerm === "" || 
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || patient.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || patient.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [queue, searchTerm, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    const pending = queue.filter(p => p.status === "pending").length;
    const inProgress = queue.filter(p => p.status === "in_progress").length;
    const scheduled = queue.filter(p => p.status === "scheduled").length;
    const noAnswer = queue.filter(p => p.status === "no_answer").length;
    return { pending, inProgress, scheduled, noAnswer, total: queue.length };
  }, [queue]);

  const handleStartCall = (patient: OutreachPatient) => {
    setSelectedPatient(patient);
    setIsOnCall(true);
    setCallStartTime(new Date());
    setCallNotes("");
    toast({
      title: "Call Started",
      description: `Calling ${patient.first_name} ${patient.last_name}`,
    });
  };

  const handleEndCall = async (outcome: "scheduled" | "declined" | "no_answer" | "callback") => {
    if (!selectedPatient) return;
    
    try {
      await fetch("/api/local/outreach-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_uuid: selectedPatient.patient_uuid,
          outcome,
          notes: callNotes,
          call_duration: callStartTime ? Math.round((Date.now() - callStartTime.getTime()) / 1000) : 0,
        }),
      });
      
      toast({
        title: "Call Logged",
        description: `Outcome: ${statusConfig[outcome].label}`,
      });
      
      setIsOnCall(false);
      setSelectedPatient(null);
      setCallNotes("");
      setCallStartTime(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log call outcome",
        variant: "destructive",
      });
    }
  };

  const getCallDuration = () => {
    if (!callStartTime) return "00:00";
    const seconds = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 p-4 min-h-full bg-background dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-850 dark:to-slate-900">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Outreach Center</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
          data-testid="button-refresh-outreach"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-muted dark:bg-slate-600/30">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <PhoneCall className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.scheduled}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassStyle} rounded-2xl`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <PhoneMissed className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.noAnswer}</p>
                <p className="text-sm text-muted-foreground">No Answer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className={`${glassStyle} rounded-2xl`}>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <Phone className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  Call Queue
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                      data-testid="input-search-outreach"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9" data-testid="select-status-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="no_answer">No Answer</SelectItem>
                      <SelectItem value="callback">Callback</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[130px] h-9" data-testid="select-priority-filter">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
              ) : filteredQueue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">No patients in queue</p>
                  <p className="text-sm">Check back later or adjust filters</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredQueue.map((patient) => {
                      const StatusIcon = statusConfig[patient.status].icon;
                      return (
                        <div
                          key={patient.patient_uuid}
                          className={`p-3 rounded-xl border transition-all cursor-pointer hover:bg-muted dark:hover:bg-slate-700/50 ${
                            selectedPatient?.patient_uuid === patient.patient_uuid 
                              ? 'bg-teal-500/20 border-teal-500/30' 
                              : 'bg-muted/50 dark:bg-slate-800/50 border-border dark:border-slate-700/50'
                          }`}
                          onClick={() => setSelectedPatient(patient)}
                          data-testid={`outreach-patient-${patient.patient_uuid}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-xl bg-muted dark:bg-slate-700/50 shrink-0">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">
                                  {patient.first_name} {patient.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">{patient.phone || "No phone"}</p>
                                <p className="text-xs text-muted-foreground/70 mt-1 truncate">{patient.reason}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <Badge className={priorityColors[patient.priority]}>
                                {patient.priority}
                              </Badge>
                              <Badge className={statusConfig[patient.status].color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[patient.status].label}
                              </Badge>
                              {patient.contact_attempts > 0 && (
                                <span className="text-xs text-muted-foreground/70">
                                  {patient.contact_attempts} attempt{patient.contact_attempts > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          {patient.service_codes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {patient.service_codes.slice(0, 4).map((code) => (
                                <Badge 
                                  key={code} 
                                  variant="outline" 
                                  className="text-xs bg-violet-500/20 border-violet-500/30 text-violet-300"
                                >
                                  {code}
                                </Badge>
                              ))}
                              {patient.service_codes.length > 4 && (
                                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                  +{patient.service_codes.length - 4}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {isOnCall && selectedPatient ? (
            <Card className={`${glassStyle} rounded-2xl border-2 border-emerald-500/30`}>
              <CardHeader className="pb-2 bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-t-2xl">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-300">
                  <PhoneCall className="h-5 w-5 animate-pulse" />
                  Active Call
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full">
                    <Timer className="h-4 w-4 text-emerald-400" />
                    <span className="font-mono text-lg font-bold text-emerald-300">
                      {getCallDuration()}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted dark:bg-slate-700/50 mb-4">
                  <p className="font-semibold text-foreground">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{selectedPatient.reason}</p>
                </div>

                <div className="flex justify-center gap-3 mb-4">
                  <Button
                    variant={isMuted ? "default" : "outline"}
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                    className="rounded-full"
                    data-testid="button-mute"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>

                <Textarea
                  placeholder="Call notes..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="mb-4 min-h-[80px]"
                  data-testid="textarea-call-notes"
                />

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleEndCall("scheduled")}
                    data-testid="button-scheduled"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Scheduled
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEndCall("callback")}
                    data-testid="button-callback"
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Callback
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEndCall("no_answer")}
                    data-testid="button-no-answer"
                  >
                    <PhoneMissed className="h-4 w-4 mr-1" />
                    No Answer
                  </Button>
                  <Button
                    variant="outline"
                    className="border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                    onClick={() => handleEndCall("declined")}
                    data-testid="button-declined"
                  >
                    <PhoneOff className="h-4 w-4 mr-1" />
                    Declined
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedPatient ? (
            <Card className={`${glassStyle} rounded-2xl`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  Patient Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className={priorityColors[selectedPatient.priority]}>
                        {selectedPatient.priority} priority
                      </Badge>
                      <Badge className={statusConfig[selectedPatient.status].color}>
                        {statusConfig[selectedPatient.status].label}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{selectedPatient.phone || "No phone number"}</span>
                    </div>
                    {selectedPatient.email && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>{selectedPatient.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{selectedPatient.contact_attempts} contact attempts</span>
                    </div>
                    {selectedPatient.last_contact_attempt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Last: {new Date(selectedPatient.last_contact_attempt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-muted dark:bg-slate-700/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Outreach Reason</p>
                    <p className="text-sm text-foreground/80">{selectedPatient.reason}</p>
                  </div>

                  {selectedPatient.service_codes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recommended Services</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedPatient.service_codes.map((code) => (
                          <Badge 
                            key={code} 
                            variant="outline"
                            className="bg-violet-500/20 border-violet-500/30 text-violet-700 dark:text-violet-300"
                          >
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPatient.notes && (
                    <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
                      <p className="text-xs font-medium text-amber-300 mb-1">Notes</p>
                      <p className="text-sm text-amber-200">{selectedPatient.notes}</p>
                    </div>
                  )}

                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    onClick={() => handleStartCall(selectedPatient)}
                    disabled={!selectedPatient.phone}
                    data-testid="button-start-call"
                  >
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Start Call
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-border text-muted-foreground"
                    onClick={() => {
                      onPatientSelect?.({
                        patient_uuid: selectedPatient.patient_uuid,
                        first_name: selectedPatient.first_name,
                        last_name: selectedPatient.last_name,
                        phone: selectedPatient.phone,
                        email: selectedPatient.email,
                      });
                    }}
                    data-testid="button-view-patient-profile"
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Patient Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={`${glassStyle} rounded-2xl`}>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  <ChevronRight className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">Select a patient</p>
                  <p className="text-sm">Click on a patient from the queue to view details</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={`${glassStyle} rounded-2xl`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Quick Scripts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="p-2 rounded-lg bg-muted dark:bg-slate-700/50 cursor-pointer hover:bg-muted/80 dark:hover:bg-slate-600/50 transition-colors">
                  <p className="font-medium text-foreground/80">Appointment Reminder</p>
                  <p className="text-xs text-muted-foreground">"Hello, this is calling from..."</p>
                </div>
                <div className="p-2 rounded-lg bg-muted dark:bg-slate-700/50 cursor-pointer hover:bg-muted/80 dark:hover:bg-slate-600/50 transition-colors">
                  <p className="font-medium text-foreground/80">Service Scheduling</p>
                  <p className="text-xs text-muted-foreground">"We're reaching out about..."</p>
                </div>
                <div className="p-2 rounded-lg bg-muted dark:bg-slate-700/50 cursor-pointer hover:bg-muted/80 dark:hover:bg-slate-600/50 transition-colors">
                  <p className="font-medium text-foreground/80">Follow-up Care</p>
                  <p className="text-xs text-muted-foreground">"This is a courtesy call..."</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
