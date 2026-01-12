import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, FileText, Pill, Beaker, Calendar, Phone, Mail, 
  MapPin, Heart, AlertTriangle, Plus, Clock, ChevronRight,
  Stethoscope, ClipboardList
} from "lucide-react";

interface Patient {
  patient_uuid: string;
  first_name: string;
  last_name: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  insurance?: string;
  mrn?: string;
}

interface PatientProfileProps {
  patient: Patient;
  onClose?: () => void;
}

interface Note {
  id: string;
  date: string;
  type: string;
  provider: string;
  content: string;
}

interface Order {
  id: string;
  date: string;
  type: "lab" | "imaging" | "medication" | "referral";
  description: string;
  status: "pending" | "completed" | "cancelled";
  provider: string;
}

export function PatientProfile({ patient, onClose }: PatientProfileProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderType, setNewOrderType] = useState<Order["type"]>("lab");
  const [newOrderDesc, setNewOrderDesc] = useState("");

  const [notes, setNotes] = useState<Note[]>([
    { id: "1", date: "2026-01-10", type: "Progress Note", provider: "Dr. Williams", content: "Patient presents with stable chronic conditions. Blood pressure well controlled on current medication regimen. Continue current medications." },
    { id: "2", date: "2026-01-05", type: "Phone Encounter", provider: "RN Smith", content: "Patient called regarding medication refill request. Verified prescription and sent to pharmacy." },
    { id: "3", date: "2025-12-15", type: "Annual Physical", provider: "Dr. Williams", content: "Comprehensive annual examination completed. All vitals within normal limits. Labs ordered for routine screening." },
  ]);

  const [orders, setOrders] = useState<Order[]>([
    { id: "1", date: "2026-01-10", type: "lab", description: "CBC with Differential", status: "completed", provider: "Dr. Williams" },
    { id: "2", date: "2026-01-10", type: "lab", description: "Comprehensive Metabolic Panel", status: "completed", provider: "Dr. Williams" },
    { id: "3", date: "2026-01-10", type: "medication", description: "Lisinopril 10mg QD", status: "pending", provider: "Dr. Williams" },
    { id: "4", date: "2026-01-05", type: "imaging", description: "Chest X-Ray", status: "pending", provider: "Dr. Chen" },
    { id: "5", date: "2025-12-20", type: "referral", description: "Cardiology Consult", status: "completed", provider: "Dr. Williams" },
  ]);

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "completed": return "bg-[#1a3d2e]/40 text-[#4a9a7c] border-[#1a3d2e]";
      case "pending": return "bg-[#3d2e1a]/40 text-[#c4a35a] border-[#3d2e1a]";
      case "cancelled": return "bg-[#3d1a1a]/40 text-[#a35a5a] border-[#3d1a1a]";
    }
  };

  const getOrderTypeIcon = (type: Order["type"]) => {
    switch (type) {
      case "lab": return <Beaker className="h-4 w-4" />;
      case "imaging": return <FileText className="h-4 w-4" />;
      case "medication": return <Pill className="h-4 w-4" />;
      case "referral": return <Stethoscope className="h-4 w-4" />;
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note: Note = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      type: "Progress Note",
      provider: "Current User",
      content: newNote,
    };
    setNotes([note, ...notes]);
    setNewNote("");
  };

  const handleAddOrder = () => {
    if (!newOrderDesc.trim()) return;
    const order: Order = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      type: newOrderType,
      description: newOrderDesc,
      status: "pending",
      provider: "Current User",
    };
    setOrders([order, ...orders]);
    setNewOrderDesc("");
    setShowNewOrder(false);
  };

  const patientAge = patient.dob 
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <Card className="border-t-4 border-t-[#3d2e1a]">
      <CardHeader className="pb-3 bg-slate-900/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#3d2e1a]/40 flex items-center justify-center border-2 border-[#3d2e1a]">
              <User className="h-8 w-8 text-[#c4a35a]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{patient.last_name}, {patient.first_name}</h2>
                <Badge className="bg-slate-700/30 text-slate-300 border-slate-700">
                  MRN: {patient.mrn || patient.patient_uuid?.slice(0, 8)}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {patient.dob && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    DOB: {patient.dob} ({patientAge} yo)
                  </span>
                )}
                {patient.gender && (
                  <span>{patient.gender}</span>
                )}
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {patient.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-profile">
              Close
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-notes">
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <ClipboardList className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="vitals" data-testid="tab-vitals">
              <Heart className="h-4 w-4 mr-2" />
              Vitals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-[#c4a35a]" />
                    Demographics
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {patient.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {patient.email}
                    </div>
                  )}
                  {patient.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {patient.address}
                    </div>
                  )}
                  {patient.insurance && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      {patient.insurance}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#a35a5a]" />
                    Allergies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-[#3d1a1a]/40 text-[#a35a5a] border-[#3d1a1a]">Penicillin</Badge>
                    <Badge className="bg-[#3d1a1a]/40 text-[#a35a5a] border-[#3d1a1a]">Sulfa</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pill className="h-4 w-4 text-[#4a9a7c]" />
                    Active Medications
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1 text-muted-foreground">
                  <p>Lisinopril 10mg QD</p>
                  <p>Metformin 500mg BID</p>
                  <p>Atorvastatin 20mg QHS</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#c4a35a]" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="flex items-center justify-between p-2 rounded-lg hover-elevate">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{note.type}</p>
                          <p className="text-xs text-muted-foreground">{note.date} - {note.provider}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Add New Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  data-testid="input-new-note"
                  placeholder="Enter clinical note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button onClick={handleAddNote} data-testid="button-add-note" className="bg-[#1a3d2e] hover:bg-[#2d5a47] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </CardContent>
            </Card>

            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {notes.map((note) => (
                  <Card key={note.id} data-testid={`note-${note.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-700/30 text-slate-300 border-slate-700">{note.type}</Badge>
                          <span className="text-sm text-muted-foreground">{note.provider}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{note.date}</span>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {!showNewOrder ? (
              <Button onClick={() => setShowNewOrder(true)} data-testid="button-new-order" className="bg-[#3d2e1a] hover:bg-[#5a4528] text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            ) : (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Create Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    {(["lab", "imaging", "medication", "referral"] as Order["type"][]).map((type) => (
                      <Button
                        key={type}
                        variant={newOrderType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewOrderType(type)}
                        data-testid={`order-type-${type}`}
                      >
                        {getOrderTypeIcon(type)}
                        <span className="ml-1 capitalize">{type}</span>
                      </Button>
                    ))}
                  </div>
                  <Input
                    data-testid="input-order-description"
                    placeholder="Order description..."
                    value={newOrderDesc}
                    onChange={(e) => setNewOrderDesc(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddOrder} data-testid="button-submit-order" className="bg-[#1a3d2e] hover:bg-[#2d5a47] text-white">
                      Submit Order
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNewOrder(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    data-testid={`order-${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        {getOrderTypeIcon(order.type)}
                      </div>
                      <div>
                        <p className="font-medium">{order.description}</p>
                        <p className="text-xs text-muted-foreground">{order.date} - {order.provider}</p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} border`}>
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="vitals" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-[#4a9a7c]">120/80</p>
                  <p className="text-sm text-muted-foreground">Blood Pressure</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">72</p>
                  <p className="text-sm text-muted-foreground">Heart Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">98.6°F</p>
                  <p className="text-sm text-muted-foreground">Temperature</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">98%</p>
                  <p className="text-sm text-muted-foreground">SpO2</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Vital Signs History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Last recorded: January 10, 2026</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
