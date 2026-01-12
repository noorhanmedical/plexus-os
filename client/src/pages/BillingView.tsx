import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockBillingData = [
  { id: "INV-001", patient: "John Smith", service: "Carotid Duplex", amount: 450, status: "Pending", date: "2026-01-10" },
  { id: "INV-002", patient: "Mary Johnson", service: "Echocardiogram", amount: 650, status: "Paid", date: "2026-01-09" },
  { id: "INV-003", patient: "Robert Davis", service: "Abdominal Duplex", amount: 380, status: "Pending", date: "2026-01-08" },
  { id: "INV-004", patient: "Sarah Wilson", service: "Lower Extremity Venous", amount: 320, status: "Overdue", date: "2026-01-05" },
  { id: "INV-005", patient: "Michael Brown", service: "Thyroid Ultrasound", amount: 275, status: "Paid", date: "2026-01-04" },
];

const statusColors: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Overdue: "bg-red-100 text-red-800 border-red-200",
};

export function BillingView() {
  const totalPending = mockBillingData
    .filter((b) => b.status === "Pending")
    .reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = mockBillingData
    .filter((b) => b.status === "Paid")
    .reduce((sum, b) => sum + b.amount, 0);
  const totalOverdue = mockBillingData
    .filter((b) => b.status === "Overdue")
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid (MTD)</CardTitle>
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
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
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
              {mockBillingData.map((invoice) => (
                <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.patient}</TableCell>
                  <TableCell>{invoice.service}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell className="text-right">${invoice.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusColors[invoice.status]} border`}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
