
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, ClipboardList, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DashboardClientContent } from "./DashboardClientContent";
import type { ProductionOrderStatus } from "@/lib/types";
import { getSkus } from "@/lib/actions/sku.actions";
import { getProductionOrders } from "@/lib/actions/production-order.actions";
import { getDemandsWithProgress } from "@/lib/actions/demand.actions";
import { format, parse, getMonth, getYear, startOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Chart configurations remain, as they define colors and labels
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
  const skus = await getSkus();
  const productionOrders = await getProductionOrders();
  const demandsWithProgress = await getDemandsWithProgress();

  // 1. Calculate Summary Card Stats
  const totalSkus = skus.length;
  const openOrders = productionOrders.filter(po => po.status === 'open').length;
  const inProgressOrders = productionOrders.filter(po => po.status === 'in_progress').length;

  // Calculate Critical Demands
  // Critical: demand for current or next month, progress < 25%, and not yet fulfilled
  const currentDate = new Date();
  const currentMonthStr = format(currentDate, 'yyyy-MM');
  const nextMonthStr = format(addMonths(currentDate, 1), 'yyyy-MM');
  
  const criticalDemands = demandsWithProgress.filter(d => 
    (d.monthYear === currentMonthStr || d.monthYear === nextMonthStr) &&
    d.progressPercentage < 25 &&
    d.producedQuantity < d.targetQuantity
  ).length;


  // 2. Prepare Production Status Chart Data
  const productionStatusCounts: Record<ProductionOrderStatus, number> = {
    open: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  productionOrders.forEach(po => {
    productionStatusCounts[po.status]++;
  });

  const actualProductionStatusData = [
    { status: chartConfigProductionStatus.open.label as string, key: 'open', count: productionStatusCounts.open, fill: chartConfigProductionStatus.open.color },
    { status: chartConfigProductionStatus.inProgress.label as string, key: 'inProgress', count: productionStatusCounts.in_progress, fill: chartConfigProductionStatus.inProgress.color },
    { status: chartConfigProductionStatus.completed.label as string, key: 'completed', count: productionStatusCounts.completed, fill: chartConfigProductionStatus.completed.color },
    { status: chartConfigProductionStatus.cancelled.label as string, key: 'cancelled', count: productionStatusCounts.cancelled, fill: chartConfigProductionStatus.cancelled.color },
  ].filter(item => item.count > 0);


  // 3. Prepare Monthly Production Chart Data (e.g., last 6 months)
  const monthlyDataAggregated: Record<string, { monthLabel: string, produced: number, target: number }> = {};
  const N_MONTHS_HISTORY = 6;

  for (let i = N_MONTHS_HISTORY -1; i >= 0; i--) {
    const dateForMonth = subMonths(currentDate, i);
    const monthYearStr = format(dateForMonth, 'yyyy-MM');
    const monthLabel = format(dateForMonth, 'MMM', { locale: ptBR });
    monthlyDataAggregated[monthYearStr] = { monthLabel, produced: 0, target: 0 };
  }
  
  demandsWithProgress.forEach(demand => {
    if (monthlyDataAggregated[demand.monthYear]) {
      monthlyDataAggregated[demand.monthYear].target += demand.targetQuantity;
    } else {
        // If demand is outside our N_MONTHS_HISTORY but we want to include it
        // For now, stick to N_MONTHS_HISTORY. This logic could be expanded.
    }
  });

  productionOrders.forEach(po => {
    if (po.status === 'completed' && po.endTime && typeof po.deliveredQuantity === 'number') {
      const completionMonthYear = format(new Date(po.endTime), 'yyyy-MM');
      if (monthlyDataAggregated[completionMonthYear]) {
        monthlyDataAggregated[completionMonthYear].produced += po.deliveredQuantity;
      }
    }
  });

  const actualMonthlyProductionData = Object.entries(monthlyDataAggregated)
    .map(([monthYear, data]) => ({
      month: data.monthLabel, // "Jan", "Fev", etc.
      produced: data.produced,
      target: data.target,
    }))
    .sort((a,b) => { // Ensure correct month order if not relying on object insertion order
        const dateA = parse(a.month, "MMM", new Date(), { locale: ptBR });
        const dateB = parse(b.month, "MMM", new Date(), { locale: ptBR });
        // This sort might be tricky if spanning year boundary; a full date parse might be better
        // Or sort by the key 'monthYear' before mapping if that was available
        return subMonths(currentDate, N_MONTHS_HISTORY - 1 - Object.keys(monthlyDataAggregated).indexOf(Object.keys(monthlyDataAggregated).find(key => monthlyDataAggregated[key].monthLabel === a.month)!))
        .getTime() -
        subMonths(currentDate, N_MONTHS_HISTORY - 1 - Object.keys(monthlyDataAggregated).indexOf(Object.keys(monthlyDataAggregated).find(key => monthlyDataAggregated[key].monthLabel === b.month)!))
        .getTime();
    });
    // A simpler sort: rely on the initial ordered creation of monthlyDataAggregated keys
    const orderedMonthKeys = Object.keys(monthlyDataAggregated).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    const finalMonthlyProductionData = orderedMonthKeys.map(key => ({
        month: monthlyDataAggregated[key].monthLabel,
        produced: monthlyDataAggregated[key].produced,
        target: monthlyDataAggregated[key].target,
    }));


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
             {/* Using text-yellow-500 as inProgress is chart-2 which is Teal. This is for icon consistency. */}
            <CheckCircle2 className="h-5 w-5 text-yellow-500" />
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
        productionStatusData={actualProductionStatusData}
        monthlyProductionData={finalMonthlyProductionData}
        chartConfigProductionStatus={chartConfigProductionStatus}
        chartConfigMonthlyProduction={chartConfigMonthlyProduction}
      />
    </div>
  );
}
