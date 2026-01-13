import { useState, useEffect, useRef } from "react";
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
import { Search, Plus, RefreshCw, Loader2, FileText, DollarSign, X, AlertTriangle, ExternalLink } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  link_screening_form?: string;
  link_order_note?: string;
  link_report?: string;
  link_procedure_note?: string;
  link_billing_document?: string;
  link_problem_list?: string;
  // Legacy/normalized fields
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

// Check if a string is a valid URL (for document links)
function isValidUrl(str: string | undefined): boolean {
  if (!str) return false;
  return str.startsWith("http://") || str.startsWith("https://");
}

// Helper to normalize billing record fields
function normalizeBillingRecord(record: BillingRecord): BillingRecord {
  return {
    ...record,
    patient_name: record.patient_name || record.patient,
    // billing_status in API is actually a document link, not a text status
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

export function BillingView() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([{ description: "", amount: 0 }]);
  const [invoicePatientId, setInvoicePatientId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const autoRebuildAttempted = useRef(false);

  const { data: billingData, isLoading, isError, refetch } = useQuery<{ ok: boolean; rows: BillingRecord[] }>({
    queryKey: ["/api/billing/search", searchQuery, serviceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      // Service filter is applied client-side since API doesn't support it
      params.set("limit", "100");
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

  // Normalize records to handle both API formats
  const rawRecords = billingData?.rows || [];
  const normalizedRecords = rawRecords.map(normalizeBillingRecord);
  
  // Apply client-side service filter
  const records = normalizedRecords.filter((record) => {
    if (serviceFilter === "all") return true;
    if (serviceFilter === "brainwave") return record.source_tab?.includes("BRAINWAVE");
    if (serviceFilter === "ultrasound") return record.source_tab?.includes("ULTRASOUND");
    return true;
  });

  // Auto-rebuild index on first load if empty
  useEffect(() => {
    if (!isLoading && !isError && billingData?.ok && rawRecords.length === 0 && !autoRebuildAttempted.current) {
      autoRebuildAttempted.current = true;
      console.log("[billing] Auto-rebuilding index on empty result");
      rebuildIndexMutation.mutate();
    }
  }, [isLoading, isError, billingData, rawRecords.length]);

  // Count records by service type
  const brainwaveCount = records.filter((b) => b.source_tab?.includes("BRAINWAVE")).length;
  const ultrasoundCount = records.filter((b) => b.source_tab?.includes("ULTRASOUND")).length;
  const otherCount = records.length - brainwaveCount - ultrasoundCount;

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

  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search billing records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-billing-search"
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-40" data-testid="select-service-filter">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="brainwave">Brainwave</SelectItem>
              <SelectItem value="ultrasound">Ultrasound</SelectItem>
            </SelectContent>
          </Select>
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
            Rebuild Index
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

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Brainwave</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{brainwaveCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ultrasound</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{ultrasoundCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Other</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-600">{otherCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Billing Records</CardTitle>
          <span className="text-sm text-muted-foreground">
            {records.length} record{records.length !== 1 ? "s" : ""}
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              <p className="text-slate-600 font-medium">Failed to load billing records</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
                Try Again
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchQuery || serviceFilter !== "all"
                ? "No billing records match your search"
                : "No billing records found. Try rebuilding the index or creating an invoice."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Clinician</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => {
                  const docLinks = [
                    { label: "Billing", url: record.link_billing_document },
                    { label: "Report", url: record.link_report },
                    { label: "Order", url: record.link_order_note },
                  ].filter(link => isValidUrl(link.url));
                  
                  return (
                    <TableRow key={index} data-testid={`row-billing-${index}`}>
                      <TableCell className="font-medium">
                        {record.patient_name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                          {record.service || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.clinician?.replace(/"/g, "") || "-"}
                      </TableCell>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {record.insurance_info || "-"}
                      </TableCell>
                      <TableCell>
                        {docLinks.length > 0 ? (
                          <div className="flex gap-1">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
