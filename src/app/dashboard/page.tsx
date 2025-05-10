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
  { month: "Fev", produced: 180, target: 200 },
  { month: "Mar", produced: 150, target: 180 },
  { month: "Abr", produced: 210, target: 220 },
  { month: "Mai", produced: 90, target: 100 },
];

const chartConfigProductionStatus = {
  count: { label: "Pedidos" },
  open: { label: "Abertos", color: "hsl(var(--chart-1))" },
  inProgress: { label: "Em Progresso", color: "hsl(var(--chart-2))" },
  completed: { label: "Concluídos", color: "hsl(var(--chart-3))" },
  cancelled: { label: "Cancelados", color: "hsl(var(--chart-4))" },
};

const chartConfigMonthlyProduction = {
  produced: { label: "Produzido", color: "hsl(var(--chart-1))" },
  target: { label: "Meta", color: "hsl(var(--chart-2))" },
};


export default async function DashboardPage() {
  // In a real app, fetch these stats
  const totalSkus = 58;
  const openOrders = 15;
  const inProgressOrders = 8;
  const criticalDemands = 2;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de SKUs</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSkus}</div>
            <p className="text-xs text-muted-foreground">SKUs gerenciados atualmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos de Produção Abertos</CardTitle>
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openOrders}</div>
            <p className="text-xs text-muted-foreground">Pedidos aguardando produção</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos em Andamento</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressOrders}</div>
            <p className="text-xs text-muted-foreground">Em produção ativa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandas Críticas</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalDemands}</div>
            <p className="text-xs text-muted-foreground">Demandas que necessitam de atenção urgente</p>
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
