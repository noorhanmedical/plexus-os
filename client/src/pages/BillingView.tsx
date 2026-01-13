import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Plus, RefreshCw, Loader2, FileText, DollarSign, X, AlertTriangle, 
  ExternalLink, TrendingUp, PieChart as PieChartIcon, BarChart3, Calendar,
  Filter, Download
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface BillingRecord {
  source_tab?: string;
  date_of_service?: string;
  patient?: string;
  clinician?: string;
  billing_status?: string;
  claim_submitted?: string;
  claim_submitted_date?: string;
  claim_adjudicated?: string;
  claim_adjudicated_date?: string;
  claim_paid_amount?: string | number;
  claim_paid_date?: string;
  patient_responsibility?: string;
  secondary_payment?: string;
  paid_amount?: string | number;
  insurance_info?: string;
  comments?: string;
  biller_comments?: string;
  link_screening?: string;
  link_order_note?: string;
  link_report?: string;
  link_procedure_note?: string;
  link_billing_document?: string;
  link_problem_list?: string;
  billing_id?: string;
  patient_uuid?: string;
  patient_name?: string;
  service?: string;
  amount?: number;
  status?: string;
  date?: string;
  invoice_number?: string;
  notes?: string;
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

function getMonthYear(dateStr: string | undefined): string {
  if (!dateStr) return "Unknown";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return "Unknown";
  }
}

function isValidUrl(str: string | undefined): boolean {
  if (!str) return false;
  return str.startsWith("http://") || str.startsWith("https://");
}

function normalizeBillingRecord(record: BillingRecord): BillingRecord {
  return {
    ...record,
    patient_name: record.patient_name || record.patient,
    status: record.status || (isValidUrl(record.billing_status) ? undefined : record.billing_status),
    amount: record.amount ?? (typeof record.paid_amount === 'number' ? record.paid_amount : parseFloat(record.paid_amount || '0') || 0),
    date: record.date || record.date_of_service,
    notes: record.notes || record.comments,
    service: record.service || formatServiceType(record.source_tab),
  };
}

interface InvoiceItem {
  description: string;
  amount: number;
}

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

export function BillingView() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [clinicianFilter, setClinicianFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>("all");
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([{ description: "", amount: 0 }]);
  const [invoicePatientId, setInvoicePatientId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const autoRebuildAttempted = useRef(false);

  const { data: billingData, isLoading, isError, refetch } = useQuery<{ ok: boolean; rows: BillingRecord[] }>({
    queryKey: ["/api/billing/search"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "500");
      const res = await fetch(`/api/billing/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch billing data");
      return res.json();
    },
    staleTime: 30000,
  });

  const rebuildIndexMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/rebuild-index");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({ title: "Success", description: "Billing index rebuilt successfully" });
        refetch();
      } else {
        toast({ title: "Error", description: data.error || "Failed to rebuild index", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to rebuild billing index", variant: "destructive" });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: { patient_uuid: string; items: InvoiceItem[]; notes: string }) => {
      const res = await apiRequest("POST", "/api/billing/invoice", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({ title: "Success", description: "Invoice created successfully" });
        setIsInvoiceDialogOpen(false);
        setInvoiceItems([{ description: "", amount: 0 }]);
        setInvoicePatientId("");
        setInvoiceNotes("");
        queryClient.invalidateQueries({ queryKey: ["/api/billing/search"] });
      } else {
        toast({ title: "Error", description: data.error || "Failed to create invoice", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create invoice", variant: "destructive" });
    },
  });

  const rawRecords = billingData?.rows || [];
  const normalizedRecords = rawRecords.map(normalizeBillingRecord);

  const uniqueClinicians = useMemo(() => {
    const clinicians = new Set<string>();
    normalizedRecords.forEach(r => {
      if (r.clinician) {
        clinicians.add(r.clinician.replace(/"/g, "").trim());
      }
    });
    return Array.from(clinicians).sort();
  }, [normalizedRecords]);

  const records = useMemo(() => {
    return normalizedRecords.filter((record) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          record.patient_name?.toLowerCase().includes(query) ||
          record.clinician?.toLowerCase().includes(query) ||
          record.service?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      if (serviceFilter !== "all") {
        if (serviceFilter === "brainwave" && !record.source_tab?.includes("BRAINWAVE")) return false;
        if (serviceFilter === "ultrasound" && !record.source_tab?.includes("ULTRASOUND")) return false;
        if (serviceFilter === "vitalwave" && !record.source_tab?.includes("VITALWAVE")) return false;
        if (serviceFilter === "other" && (record.source_tab?.includes("BRAINWAVE") || record.source_tab?.includes("ULTRASOUND") || record.source_tab?.includes("VITALWAVE"))) return false;
      }
      
      if (clinicianFilter !== "all") {
        if (!record.clinician?.includes(clinicianFilter)) return false;
      }
      
      if (dateRangeFilter !== "all" && record.date) {
        const recordDate = new Date(record.date);
        const now = new Date();
        if (dateRangeFilter === "today") {
          if (recordDate.toDateString() !== now.toDateString()) return false;
        } else if (dateRangeFilter === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (recordDate < weekAgo) return false;
        } else if (dateRangeFilter === "month") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (recordDate < monthAgo) return false;
        } else if (dateRangeFilter === "quarter") {
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (recordDate < quarterAgo) return false;
        }
      }
      
      if (claimStatusFilter !== "all") {
        const hasSubmitted = record.claim_submitted && isValidUrl(record.claim_submitted);
        const hasAdjudicated = record.claim_adjudicated && isValidUrl(record.claim_adjudicated);
        const hasPaid = record.claim_paid_amount && parseFloat(String(record.claim_paid_amount)) > 0;
        
        if (claimStatusFilter === "submitted" && !hasSubmitted) return false;
        if (claimStatusFilter === "adjudicated" && !hasAdjudicated) return false;
        if (claimStatusFilter === "paid" && !hasPaid) return false;
        if (claimStatusFilter === "pending" && (hasSubmitted || hasAdjudicated || hasPaid)) return false;
      }
      
      return true;
    });
  }, [normalizedRecords, searchQuery, serviceFilter, clinicianFilter, dateRangeFilter, claimStatusFilter]);

  useEffect(() => {
    if (!isLoading && !isError && billingData?.ok && rawRecords.length === 0 && !autoRebuildAttempted.current) {
      autoRebuildAttempted.current = true;
      rebuildIndexMutation.mutate();
    }
  }, [isLoading, isError, billingData, rawRecords.length]);

  const stats = useMemo(() => {
    const brainwaveCount = records.filter((b) => b.source_tab?.includes("BRAINWAVE")).length;
    const ultrasoundCount = records.filter((b) => b.source_tab?.includes("ULTRASOUND")).length;
    const vitalwaveCount = records.filter((b) => b.source_tab?.includes("VITALWAVE")).length;
    const otherCount = records.length - brainwaveCount - ultrasoundCount - vitalwaveCount;
    
    const totalPaid = records.reduce((sum, r) => {
      const amount = parseFloat(String(r.claim_paid_amount || 0));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    return { brainwaveCount, ultrasoundCount, vitalwaveCount, otherCount, totalPaid };
  }, [records]);

  const serviceChartData = useMemo(() => [
    { name: "Brainwave", value: stats.brainwaveCount, color: "#3b82f6" },
    { name: "Ultrasound", value: stats.ultrasoundCount, color: "#8b5cf6" },
    { name: "Vitalwave", value: stats.vitalwaveCount, color: "#10b981" },
    { name: "Other", value: stats.otherCount, color: "#6b7280" },
  ].filter(d => d.value > 0), [stats]);

  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, { brainwave: number; ultrasound: number; vitalwave: number; other: number }>();
    
    records.forEach(r => {
      const month = getMonthYear(r.date);
      if (!monthMap.has(month)) {
        monthMap.set(month, { brainwave: 0, ultrasound: 0, vitalwave: 0, other: 0 });
      }
      const data = monthMap.get(month)!;
      if (r.source_tab?.includes("BRAINWAVE")) data.brainwave++;
      else if (r.source_tab?.includes("ULTRASOUND")) data.ultrasound++;
      else if (r.source_tab?.includes("VITALWAVE")) data.vitalwave++;
      else data.other++;
    });
    
    return Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-12);
  }, [records]);

  const clinicianChartData = useMemo(() => {
    const clinicianMap = new Map<string, number>();
    records.forEach(r => {
      const clinician = r.clinician?.replace(/"/g, "").trim() || "Unknown";
      clinicianMap.set(clinician, (clinicianMap.get(clinician) || 0) + 1);
    });
    return Array.from(clinicianMap.entries())
      .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 20) + "..." : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [records]);

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: "", amount: 0 }]);
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceItems(updated);
  };

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  const handleCreateInvoice = () => {
    if (!invoicePatientId.trim()) {
      toast({ title: "Error", description: "Please enter a Patient ID", variant: "destructive" });
      return;
    }
    if (invoiceItems.every((item) => !item.description.trim())) {
      toast({ title: "Error", description: "Please add at least one line item", variant: "destructive" });
      return;
    }
    createInvoiceMutation.mutate({
      patient_uuid: invoicePatientId.trim(),
      items: invoiceItems.filter((item) => item.description.trim()),
      notes: invoiceNotes,
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setServiceFilter("all");
    setClinicianFilter("all");
    setDateRangeFilter("all");
    setClaimStatusFilter("all");
  };

  const hasActiveFilters = searchQuery || serviceFilter !== "all" || clinicianFilter !== "all" || dateRangeFilter !== "all" || claimStatusFilter !== "all";

  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
        <p className="text-slate-600 font-medium text-lg">Failed to load billing records</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {normalizedRecords.length} total records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => rebuildIndexMutation.mutate()}
            disabled={rebuildIndexMutation.isPending}
            data-testid="button-rebuild-index"
          >
            {rebuildIndexMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Data
          </Button>
          <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-invoice">
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Create New Invoice
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="patient-id">Patient ID</Label>
                  <Input
                    id="patient-id"
                    placeholder="e.g., pt_abc123..."
                    value={invoicePatientId}
                    onChange={(e) => setInvoicePatientId(e.target.value)}
                    data-testid="input-invoice-patient-id"
                  />
                </div>
                <div>
                  <Label>Line Items</Label>
                  <div className="space-y-2 mt-2">
                    {invoiceItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, "description", e.target.value)}
                          className="flex-1"
                          data-testid={`input-item-description-${index}`}
                        />
                        <div className="relative w-28">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={item.amount || ""}
                            onChange={(e) => updateInvoiceItem(index, "amount", parseFloat(e.target.value) || 0)}
                            className="pl-7"
                            data-testid={`input-item-amount-${index}`}
                          />
                        </div>
                        {invoiceItems.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeInvoiceItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <X className="h-4 w-4 text-slate-500 hover:text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addInvoiceItem}
                    className="mt-2"
                    data-testid="button-add-line-item"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Line Item
                  </Button>
                </div>
                <div>
                  <Label htmlFor="invoice-notes">Notes (optional)</Label>
                  <Textarea
                    id="invoice-notes"
                    placeholder="Additional notes..."
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    rows={2}
                    data-testid="textarea-invoice-notes"
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-lg font-semibold">
                    Total: <span className="text-emerald-600">${invoiceTotal.toFixed(2)}</span>
                  </div>
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={createInvoiceMutation.isPending}
                    data-testid="button-submit-invoice"
                  >
                    {createInvoiceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Create Invoice
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
            <PieChartIcon className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2" data-testid="tab-trends">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2" data-testid="tab-records">
            <BarChart3 className="h-4 w-4" />
            All Records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{records.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Brainwave</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{stats.brainwaveCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ultrasound</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">{stats.ultrasoundCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vitalwave</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">{stats.vitalwaveCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-slate-500" />
                  Services Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={serviceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {serviceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-10">No data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-slate-500" />
                  Top Clinicians
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clinicianChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={clinicianChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-10">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-slate-500" />
                Monthly Trends by Service Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="brainwave" stroke="#3b82f6" strokeWidth={2} name="Brainwave" />
                    <Line type="monotone" dataKey="ultrasound" stroke="#8b5cf6" strokeWidth={2} name="Ultrasound" />
                    <Line type="monotone" dataKey="vitalwave" stroke="#10b981" strokeWidth={2} name="Vitalwave" />
                    <Line type="monotone" dataKey="other" stroke="#6b7280" strokeWidth={2} name="Other" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-10">No trend data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-slate-500" />
                Monthly Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="brainwave" stackId="a" fill="#3b82f6" name="Brainwave" />
                    <Bar dataKey="ultrasound" stackId="a" fill="#8b5cf6" name="Ultrasound" />
                    <Bar dataKey="vitalwave" stackId="a" fill="#10b981" name="Vitalwave" />
                    <Bar dataKey="other" stackId="a" fill="#6b7280" name="Other" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-10">No trend data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search patients, clinicians..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-billing-search"
                />
              </div>
              
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-service-filter">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="brainwave">Brainwave</SelectItem>
                  <SelectItem value="ultrasound">Ultrasound</SelectItem>
                  <SelectItem value="vitalwave">Vitalwave</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clinicianFilter} onValueChange={setClinicianFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-clinician-filter">
                  <SelectValue placeholder="Clinician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clinicians</SelectItem>
                  {uniqueClinicians.map(c => (
                    <SelectItem key={c} value={c}>{c.length > 25 ? c.slice(0, 25) + "..." : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-date-filter">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={claimStatusFilter} onValueChange={setClaimStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="adjudicated">Adjudicated</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <CardTitle>Billing Records</CardTitle>
              <span className="text-sm text-muted-foreground">
                Showing {records.length} of {normalizedRecords.length} records
              </span>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  {hasActiveFilters
                    ? "No billing records match your filters"
                    : "No billing records found"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Clinician</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Documents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.slice(0, 100).map((record, index) => {
                        const docLinks = [
                          { label: "Billing", url: record.link_billing_document || record.billing_status },
                          { label: "Report", url: record.link_report },
                          { label: "Order", url: record.link_order_note },
                        ].filter(link => isValidUrl(link.url));
                        
                        const hasSubmitted = isValidUrl(record.claim_submitted);
                        const hasAdjudicated = isValidUrl(record.claim_adjudicated);
                        const hasPaid = record.claim_paid_amount && parseFloat(String(record.claim_paid_amount)) > 0;
                        
                        let statusBadge: { label: string; variant: "default" | "secondary" | "outline" | "destructive" } = { label: "Pending", variant: "secondary" };
                        if (hasPaid) statusBadge = { label: "Paid", variant: "default" };
                        else if (hasAdjudicated) statusBadge = { label: "Adjudicated", variant: "outline" };
                        else if (hasSubmitted) statusBadge = { label: "Submitted", variant: "outline" };
                        
                        return (
                          <TableRow key={index} data-testid={`row-billing-${index}`}>
                            <TableCell className="font-medium max-w-[180px] truncate">
                              {record.patient_name || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  record.source_tab?.includes("BRAINWAVE") ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  record.source_tab?.includes("ULTRASOUND") ? "bg-purple-50 text-purple-700 border-purple-200" :
                                  record.source_tab?.includes("VITALWAVE") ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  "bg-slate-100 text-slate-700 border-slate-200"
                                }
                              >
                                {record.service || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[150px] truncate">
                              {record.clinician?.replace(/"/g, "") || "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(record.date)}</TableCell>
                            <TableCell>
                              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {docLinks.length > 0 ? (
                                <div className="flex gap-2">
                                  {docLinks.map((link, i) => (
                                    <a
                                      key={i}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      {link.label}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {records.length > 100 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Showing first 100 records. Use filters to narrow results.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
