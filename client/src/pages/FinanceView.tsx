import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
  const totalProfit = monthlyData.reduce((sum, m) => sum + m.profit, 0);

  return (
    <div className="space-y-6">
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
