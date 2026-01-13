import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Heart,
  Pill,
  AlertTriangle,
  FileText,
  Activity,
  Stethoscope,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  TestTube,
  Scan,
  MessageSquare,
  ListTodo,
  Loader2,
  Receipt
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BillingRecord {
  billing_id: string;
  invoice_number?: string;
  service?: string;
  amount?: number;
  status?: string;
  date?: string;
}

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

interface PatientChartProps {
  patient: Patient;
}

type MenuSection = "prescreens" | "eligibility" | "ancillary" | "schedule" | "finance" | "notes" | "tasks";

interface MenuItem {
  id: MenuSection;
  label: string;
  icon: typeof ClipboardList;
  subItems: { id: string; label: string; count?: number }[];
}

const menuItems: MenuItem[] = [
  {
    id: "prescreens",
    label: "Prescreens",
    icon: ClipboardList,
    subItems: [
      { id: "active", label: "Active Prescreens", count: 2 },
      { id: "pending", label: "Pending Review", count: 1 },
      { id: "completed", label: "Completed", count: 5 },
      { id: "cancelled", label: "Cancelled", count: 0 },
    ],
  },
  {
    id: "eligibility",
    label: "Eligibility & Risk",
    icon: Shield,
    subItems: [
      { id: "insurance", label: "Insurance Verification" },
      { id: "clinical", label: "Clinical Criteria" },
      { id: "auth", label: "Authorizations" },
      { id: "risk", label: "Risk Assessment" },
    ],
  },
  {
    id: "ancillary",
    label: "Ancillary",
    icon: Activity,
    subItems: [
      { id: "active-orders", label: "Active Orders", count: 0 },
      { id: "add-new", label: "Add New" },
    ],
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: Calendar,
    subItems: [
      { id: "upcoming", label: "Upcoming Appointments", count: 1 },
      { id: "past", label: "Past Visits", count: 8 },
      { id: "no-show", label: "No Shows", count: 0 },
    ],
  },
  {
    id: "finance",
    label: "Finance & Billing",
    icon: DollarSign,
    subItems: [
      { id: "billing", label: "Invoices & Billing" },
      { id: "balance", label: "Account Balance" },
      { id: "estimates", label: "Cost Estimates" },
      { id: "payments", label: "Payment History" },
    ],
  },
  {
    id: "notes",
    label: "Clinical Notes",
    icon: FileText,
    subItems: [
      { id: "progress", label: "Progress Notes", count: 3 },
      { id: "prescreen-notes", label: "Prescreen Notes", count: 2 },
      { id: "communication", label: "Communication Log", count: 5 },
    ],
  },
  {
    id: "tasks",
    label: "Task Center",
    icon: ListTodo,
    subItems: [
      { id: "pending-tasks", label: "Pending Tasks", count: 4 },
      { id: "completed-tasks", label: "Completed Tasks", count: 12 },
    ],
  },
];

const billingStatusColorMap: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

function getBillingStatusColor(status: string | undefined): string {
  if (!status) return "bg-slate-100 text-slate-700";
  return billingStatusColorMap[status.toLowerCase()] || "bg-slate-100 text-slate-700";
}

export function PatientChart({ patient }: PatientChartProps) {
  const [activeSection, setActiveSection] = useState<MenuSection>("prescreens");
  const [activeSubItem, setActiveSubItem] = useState<string>("active");
  const [expandedSections, setExpandedSections] = useState<string[]>(["prescreens"]);

  const { data: billingData, isLoading: billingLoading, isError: billingError, refetch: refetchBilling } = useQuery<{ ok: boolean; rows: BillingRecord[] }>({
    queryKey: ["/api/patients", patient.patient_uuid, "billing"],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patient.patient_uuid}/billing`);
      if (!res.ok) throw new Error("Failed to fetch billing data");
      return res.json();
    },
    enabled: activeSection === "finance",
    staleTime: 60000,
  });

  const billingRecords = billingData?.rows || [];

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSectionClick = (sectionId: MenuSection) => {
    setActiveSection(sectionId);
    const section = menuItems.find(m => m.id === sectionId);
    if (section && section.subItems.length > 0) {
      setActiveSubItem(section.subItems[0].id);
    }
    if (expandedSections.includes(sectionId)) {
      setExpandedSections(expandedSections.filter(s => s !== sectionId));
    } else {
      setExpandedSections([...expandedSections, sectionId]);
    }
  };

  const renderTableContent = () => {
    if (activeSection === "prescreens") {
      return (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="text-slate-600">Start Date</TableHead>
              <TableHead className="text-slate-600">Status</TableHead>
              <TableHead className="text-slate-600">Service</TableHead>
              <TableHead className="text-slate-600">Assigned To</TableHead>
              <TableHead className="text-slate-600">Location</TableHead>
              <TableHead className="text-slate-600">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/13/2026</TableCell>
              <TableCell>
                <Badge className="bg-amber-100 text-amber-700 border-amber-300">Pending</Badge>
              </TableCell>
              <TableCell className="text-slate-900 font-medium">IV Therapy - Iron Infusion</TableCell>
              <TableCell className="text-slate-600">Dr. Smith</TableCell>
              <TableCell className="text-slate-600">Clinic A</TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">View</TableCell>
            </TableRow>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/10/2026</TableCell>
              <TableCell>
                <Badge className="bg-green-100 text-green-700 border-green-300">Cleared</Badge>
              </TableCell>
              <TableCell className="text-slate-900 font-medium">Lab Work - CBC Panel</TableCell>
              <TableCell className="text-slate-600">Nurse Johnson</TableCell>
              <TableCell className="text-slate-600">Lab Center</TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">View</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    if (activeSection === "ancillary") {
      if (activeSubItem === "add-new") {
        return (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">Add New Ancillary Order</h3>
            <p className="text-slate-500 mb-4">Select from the Ancillary Catalog to add services for this patient</p>
            <button 
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
              data-testid="button-open-ancillary-catalog"
            >
              Open Ancillary Catalog
            </button>
          </div>
        );
      }
      return (
        <div className="text-center py-12 text-slate-500">
          <Activity className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p>No active ancillary orders for this patient</p>
          <p className="text-sm mt-2">Use "Add New" to create an order from the Ancillary Catalog</p>
        </div>
      );
    }

    if (activeSection === "schedule") {
      return (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="text-slate-600">Date/Time</TableHead>
              <TableHead className="text-slate-600">Status</TableHead>
              <TableHead className="text-slate-600">Appointment Type</TableHead>
              <TableHead className="text-slate-600">Provider</TableHead>
              <TableHead className="text-slate-600">Location</TableHead>
              <TableHead className="text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/15/2026 10:00 AM</TableCell>
              <TableCell>
                <Badge className="bg-blue-100 text-blue-700 border-blue-300">Confirmed</Badge>
              </TableCell>
              <TableCell className="text-slate-900 font-medium">IV Infusion</TableCell>
              <TableCell className="text-slate-600">Dr. Smith</TableCell>
              <TableCell className="text-slate-600">Infusion Center</TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Reschedule</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    if (activeSection === "eligibility") {
      return (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="text-slate-600">Check Date</TableHead>
              <TableHead className="text-slate-600">Type</TableHead>
              <TableHead className="text-slate-600">Status</TableHead>
              <TableHead className="text-slate-600">Details</TableHead>
              <TableHead className="text-slate-600">Expiration</TableHead>
              <TableHead className="text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/10/2026</TableCell>
              <TableCell className="text-slate-900 font-medium">Insurance Verification</TableCell>
              <TableCell>
                <Badge className="bg-green-100 text-green-700">Verified</Badge>
              </TableCell>
              <TableCell className="text-slate-600">Blue Cross PPO - Active</TableCell>
              <TableCell className="text-slate-600">12/31/2026</TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Reverify</TableCell>
            </TableRow>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/10/2026</TableCell>
              <TableCell className="text-slate-900 font-medium">Clinical Criteria</TableCell>
              <TableCell>
                <Badge className="bg-green-100 text-green-700">Met</Badge>
              </TableCell>
              <TableCell className="text-slate-600">IV Therapy criteria satisfied</TableCell>
              <TableCell className="text-slate-600">-</TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Review</TableCell>
            </TableRow>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/08/2026</TableCell>
              <TableCell className="text-slate-900 font-medium">Authorization</TableCell>
              <TableCell>
                <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
              </TableCell>
              <TableCell className="text-slate-600">Prior auth submitted</TableCell>
              <TableCell className="text-slate-600">-</TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Follow Up</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    if (activeSection === "finance") {
      if (billingLoading) {
        return (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        );
      }

      if (billingError) {
        return (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-400 mb-3" />
            <p className="text-slate-600 font-medium">Failed to load billing records</p>
            <Button variant="outline" size="sm" onClick={() => refetchBilling()} className="mt-3">
              Try Again
            </Button>
          </div>
        );
      }

      if (billingRecords.length === 0) {
        return (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No billing records for this patient</p>
            <p className="text-slate-400 text-sm mt-1">Invoices will appear here when created</p>
          </div>
        );
      }

      return (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="text-slate-600">Invoice #</TableHead>
              <TableHead className="text-slate-600">Date</TableHead>
              <TableHead className="text-slate-600">Service</TableHead>
              <TableHead className="text-slate-600">Amount</TableHead>
              <TableHead className="text-slate-600">Status</TableHead>
              <TableHead className="text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billingRecords.map((record, index) => (
              <TableRow key={record.billing_id || index} className="border-slate-200 hover:bg-slate-50">
                <TableCell className="text-slate-900 font-medium">
                  {record.invoice_number || record.billing_id || "-"}
                </TableCell>
                <TableCell className="text-slate-700">{record.date || "-"}</TableCell>
                <TableCell className="text-slate-600">{record.service || "-"}</TableCell>
                <TableCell className="text-slate-900 font-semibold">
                  {record.amount != null ? `$${record.amount.toLocaleString()}` : "-"}
                </TableCell>
                <TableCell>
                  {record.status ? (
                    <Badge className={getBillingStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-blue-600 cursor-pointer hover:underline">View</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (activeSection === "notes") {
      return (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="text-slate-600">Date/Time</TableHead>
              <TableHead className="text-slate-600">Type</TableHead>
              <TableHead className="text-slate-600">Author</TableHead>
              <TableHead className="text-slate-600">Subject</TableHead>
              <TableHead className="text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/13/2026 9:30 AM</TableCell>
              <TableCell className="text-slate-900 font-medium">Prescreen Note</TableCell>
              <TableCell className="text-slate-600">Nurse Johnson</TableCell>
              <TableCell className="text-slate-600">IV Therapy prescreen completed, patient cleared</TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Read</TableCell>
            </TableRow>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/10/2026 2:15 PM</TableCell>
              <TableCell className="text-slate-900 font-medium">Communication</TableCell>
              <TableCell className="text-slate-600">Front Desk</TableCell>
              <TableCell className="text-slate-600">Called patient to confirm appointment</TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Read</TableCell>
            </TableRow>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/08/2026 11:00 AM</TableCell>
              <TableCell className="text-slate-900 font-medium">Progress Note</TableCell>
              <TableCell className="text-slate-600">Dr. Smith</TableCell>
              <TableCell className="text-slate-600">Follow-up visit - lab review</TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Read</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    if (activeSection === "tasks") {
      return (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="text-slate-600">Due Date</TableHead>
              <TableHead className="text-slate-600">Priority</TableHead>
              <TableHead className="text-slate-600">Task</TableHead>
              <TableHead className="text-slate-600">Assigned To</TableHead>
              <TableHead className="text-slate-600">Status</TableHead>
              <TableHead className="text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/14/2026</TableCell>
              <TableCell>
                <Badge className="bg-red-100 text-red-700">High</Badge>
              </TableCell>
              <TableCell className="text-slate-900 font-medium">Complete prescreen for IV therapy</TableCell>
              <TableCell className="text-slate-600">Nurse Johnson</TableCell>
              <TableCell>
                <Badge className="bg-amber-100 text-amber-700">In Progress</Badge>
              </TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Update</TableCell>
            </TableRow>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/15/2026</TableCell>
              <TableCell>
                <Badge className="bg-amber-100 text-amber-700">Medium</Badge>
              </TableCell>
              <TableCell className="text-slate-900 font-medium">Follow up on prior authorization</TableCell>
              <TableCell className="text-slate-600">Billing Team</TableCell>
              <TableCell>
                <Badge className="bg-blue-100 text-blue-700">Pending</Badge>
              </TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Update</TableCell>
            </TableRow>
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableCell className="text-slate-700">01/20/2026</TableCell>
              <TableCell>
                <Badge className="bg-slate-100 text-slate-600">Low</Badge>
              </TableCell>
              <TableCell className="text-slate-900 font-medium">Schedule 3-month follow-up</TableCell>
              <TableCell className="text-slate-600">Front Desk</TableCell>
              <TableCell>
                <Badge className="bg-blue-100 text-blue-700">Pending</Badge>
              </TableCell>
              <TableCell className="text-blue-600 cursor-pointer hover:underline">Update</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    return (
      <div className="text-center py-12 text-slate-500">
        <p>Select a category to view details</p>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4" data-testid="patient-chart">
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-lg font-semibold">
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900" data-testid="text-patient-name">
                {patient.last_name}, {patient.first_name}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-slate-600 text-sm">
                {patient.mrn && (
                  <span data-testid="text-patient-mrn">MRN: {patient.mrn}</span>
                )}
                {patient.dob && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {patient.dob} ({calculateAge(patient.dob)} yrs)
                  </span>
                )}
                {patient.gender && (
                  <Badge variant="outline" className="text-xs">
                    {patient.gender}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {patient.phone && (
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-3.5 w-3.5" />
                {patient.phone}
              </span>
            )}
            {patient.insurance && (
              <Badge variant="secondary" className="ml-2">
                {patient.insurance}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <Card className="w-64 bg-white border-slate-200 shadow-sm flex-shrink-0">
          <CardHeader className="py-3 px-4 border-b border-slate-200 bg-slate-50/80">
            <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Menu</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="py-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isExpanded = expandedSections.includes(item.id);
                const isActive = activeSection === item.id;
                
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => handleSectionClick(item.id)}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                        isActive 
                          ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      data-testid={`menu-${item.id}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-6 border-l border-slate-200">
                        {item.subItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              setActiveSection(item.id);
                              setActiveSubItem(subItem.id);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-1.5 text-left text-xs transition-colors ${
                              activeSection === item.id && activeSubItem === subItem.id
                                ? "bg-blue-100 text-blue-700"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                            data-testid={`submenu-${subItem.id}`}
                          >
                            <span>{subItem.label}</span>
                            {subItem.count !== undefined && subItem.count > 0 && (
                              <Badge variant="secondary" className="h-5 min-w-5 text-xs">
                                {subItem.count}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex-1 bg-white border-slate-200 shadow-sm flex flex-col min-w-0">
          <CardHeader className="py-3 px-4 border-b border-slate-200 bg-slate-50/80 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">
                {menuItems.find(m => m.id === activeSection)?.label} - {menuItems.find(m => m.id === activeSection)?.subItems.find(s => s.id === activeSubItem)?.label}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Last updated: Today
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {renderTableContent()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
