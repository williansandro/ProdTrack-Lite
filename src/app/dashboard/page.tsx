import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, PieChart as PieChartIcon, Package, ClipboardList, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";

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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Production Order Status</CardTitle>
            <CardDescription>Overview of current order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigProductionStatus} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={productionStatusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Production vs. Target</CardTitle>
            <CardDescription>Tracking output against set goals</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigMonthlyProduction} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyProductionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="produced" fill="var(--color-produced)" radius={4} />
                  <Bar dataKey="target" fill="var(--color-target)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
