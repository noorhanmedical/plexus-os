import { useState } from "react";
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
import { Search, Plus, RefreshCw, Loader2, FileText, DollarSign, X, AlertTriangle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BillingRecord {
  billing_id: string;
  patient_uuid?: string;
  patient_name?: string;
  service?: string;
  amount?: number;
  status?: string;
  date?: string;
  invoice_number?: string;
  notes?: string;
}

interface InvoiceItem {
  description: string;
  amount: number;
}

const statusColorMap: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-slate-100 text-slate-800 border-slate-200",
};

function getStatusColor(status: string | undefined): string {
  if (!status) return "bg-slate-100 text-slate-800 border-slate-200";
  return statusColorMap[status.toLowerCase()] || "bg-slate-100 text-slate-800 border-slate-200";
}

export function BillingView() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([{ description: "", amount: 0 }]);
  const [invoicePatientId, setInvoicePatientId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const { data: billingData, isLoading, isError, refetch } = useQuery<{ ok: boolean; rows: BillingRecord[] }>({
    queryKey: ["/api/billing/search", searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
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

  const records = billingData?.rows || [];

  const totalPending = records
    .filter((b) => b.status?.toLowerCase() === "pending")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPaid = records
    .filter((b) => b.status?.toLowerCase() === "paid")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalOverdue = records
    .filter((b) => b.status?.toLowerCase() === "overdue")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">${totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">${totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">${totalOverdue.toLocaleString()}</p>
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
              {searchQuery || statusFilter !== "all"
                ? "No billing records match your search"
                : "No billing records found. Try rebuilding the index or creating an invoice."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => (
                  <TableRow key={record.billing_id || index} data-testid={`row-billing-${record.billing_id || index}`}>
                    <TableCell className="font-medium">
                      {record.invoice_number || record.billing_id || "-"}
                    </TableCell>
                    <TableCell>{record.patient_name || record.patient_uuid || "-"}</TableCell>
                    <TableCell>{record.service || "-"}</TableCell>
                    <TableCell>{record.date || "-"}</TableCell>
                    <TableCell className="text-right">
                      {record.amount != null ? `$${record.amount.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      {record.status ? (
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(record.status)} border`}
                        >
                          {record.status}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
