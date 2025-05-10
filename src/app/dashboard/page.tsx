import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, ClipboardList, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DashboardClientContent } from "./DashboardClientContent";

// Mock data for charts - replace with actual data fetching
const productionStatusData = [
  { status: "Open", count: 15, fill: "var(--color-open)" },
  { status: "In Progress", count: 8, fill: "var(--color-inProgress)" },
  { status: "Completed", count: 45, fill: "var(--color-completed)" },
  { status: "Cancelled", count: 3, fill: "var(--color-cancelled)" },
];

const monthlyProductionData = [
  { month: "Jan", produced: 120, target: 150 },
  { month: "Feb", produced: 180, target: 200 },
  { month: "Mar", produced: 150, target: 180 },
  { month: "Apr", produced: 210, target: 220 },
  { month: "May", produced: 90, target: 100 },
];

const chartConfigProductionStatus = {
  count: { label: "Orders" },
  open: { label: "Open", color: "hsl(var(--chart-1))" },
  inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
  completed: { label: "Completed", color: "hsl(var(--chart-3))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--chart-4))" },
};

const chartConfigMonthlyProduction = {
  produced: { label: "Produced", color: "hsl(var(--chart-1))" },
  target: { label: "Target", color: "hsl(var(--chart-2))" },
};


export default async function DashboardPage() {
  // In a real app, fetch these stats
  const totalSkus = 58;
  const openOrders = 15;
  const inProgressOrders = 8;
  const criticalDemands = 2;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSkus}</div>
            <p className="text-xs text-muted-foreground">Currently managed SKUs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Production Orders</CardTitle>
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openOrders}</div>
            <p className="text-xs text-muted-foreground">Orders awaiting production</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders In Progress</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressOrders}</div>
            <p className="text-xs text-muted-foreground">Actively being produced</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Demands</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalDemands}</div>
            <p className="text-xs text-muted-foreground">Demands needing urgent attention</p>
          </CardContent>
        </Card>
      </div>

      <DashboardClientContent
        productionStatusData={productionStatusData}
        monthlyProductionData={monthlyProductionData}
        chartConfigProductionStatus={chartConfigProductionStatus}
        chartConfigMonthlyProduction={chartConfigMonthlyProduction}
      />
    </div>
  );
}
