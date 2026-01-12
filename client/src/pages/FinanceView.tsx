import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Send, FileText } from "lucide-react";

const monthlyData = [
  { month: "January", revenue: 45200, expenses: 32100, profit: 13100 },
  { month: "February", revenue: 52800, expenses: 35400, profit: 17400 },
  { month: "March", revenue: 48600, expenses: 33800, profit: 14800 },
  { month: "April", revenue: 55100, expenses: 36200, profit: 18900 },
  { month: "May", revenue: 61300, expenses: 38500, profit: 22800 },
  { month: "June", revenue: 58900, expenses: 37100, profit: 21800 },
];

const topServices = [
  { service: "Echocardiogram", count: 142, revenue: 92300 },
  { service: "Carotid Duplex", count: 98, revenue: 44100 },
  { service: "Abdominal Duplex", count: 76, revenue: 28880 },
  { service: "Lower Extremity Venous", count: 65, revenue: 20800 },
  { service: "Thyroid Ultrasound", count: 54, revenue: 14850 },
];

export function FinanceView() {
  const { toast } = useToast();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    patientName: "",
    email: "",
    amount: "",
    description: "",
  });
  const [isSending, setIsSending] = useState(false);

  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
  const totalProfit = monthlyData.reduce((sum, m) => sum + m.profit, 0);

  const handleSendInvoice = async () => {
    if (!invoiceData.patientName || !invoiceData.email || !invoiceData.amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    // Simulate sending invoice
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSending(false);
    setInvoiceOpen(false);
    setInvoiceData({ patientName: "", email: "", amount: "", description: "" });
    
    toast({
      title: "Invoice Sent",
      description: `Invoice for $${invoiceData.amount} sent to ${invoiceData.email}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Finance Dashboard</h2>
        <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-send-invoice" className="gap-2">
              <Send className="h-4 w-4" />
              Send Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Send Invoice
              </DialogTitle>
              <DialogDescription>
                Create and send an invoice to a patient.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="patientName">Patient Name *</Label>
                <Input
                  id="patientName"
                  data-testid="input-invoice-patient"
                  placeholder="John Smith"
                  value={invoiceData.patientName}
                  onChange={(e) => setInvoiceData({ ...invoiceData, patientName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-invoice-email"
                  placeholder="patient@email.com"
                  value={invoiceData.email}
                  onChange={(e) => setInvoiceData({ ...invoiceData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  data-testid="input-invoice-amount"
                  placeholder="150.00"
                  value={invoiceData.amount}
                  onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-invoice-description"
                  placeholder="Services rendered..."
                  value={invoiceData.description}
                  onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInvoiceOpen(false)} data-testid="button-cancel-invoice">
                Cancel
              </Button>
              <Button 
                data-testid="button-confirm-send-invoice"
                onClick={handleSendInvoice} 
                disabled={isSending}
                className="gap-2"
              >
                {isSending ? "Sending..." : "Send Invoice"}
                <Send className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">${totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">${totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">${totalProfit.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((row) => (
                  <TableRow key={row.month} data-testid={`row-month-${row.month}`}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right">${row.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${row.expenses.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600">${row.profit.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Services by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topServices.map((row) => (
                  <TableRow key={row.service} data-testid={`row-service-${row.service}`}>
                    <TableCell className="font-medium">{row.service}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">${row.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
