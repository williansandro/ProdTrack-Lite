
"use client";

import type { ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, BarChart as RechartsBarChart, Cell } from "recharts";

interface ProductionStatusDataItem {
  status: string; // This will be the label e.g. "Abertos"
  key: string; // This will be the key e.g. "open"
  count: number;
  fill: string; // This should be the HSL color string from chartConfig
}

interface MonthlyProductionDataItem {
  month: string; // e.g., "Jan", "Fev"
  produced: number;
  target: number;
}

interface DashboardClientContentProps {
  productionStatusData: ProductionStatusDataItem[];
  monthlyProductionData: MonthlyProductionDataItem[];
  chartConfigProductionStatus: ChartConfig;
  chartConfigMonthlyProduction: ChartConfig;
}

export function DashboardClientContent({
  productionStatusData,
  monthlyProductionData,
  chartConfigProductionStatus,
  chartConfigMonthlyProduction,
}: DashboardClientContentProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Status dos Pedidos de Produção</CardTitle>
          <CardDescription>Visão geral dos status atuais dos pedidos</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigProductionStatus} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                <Pie
                  data={productionStatusData}
                  dataKey="count"
                  nameKey="status" // Uses the 'status' field (e.g., "Abertos") for legend and tooltip name
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                    const RADIAN = Math.PI / 180;
                    // only show label if percent is > 5% to avoid clutter
                    if (percent * 100 < 5) return null; 
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {productionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} name={entry.status}/>
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produção Mensal vs. Meta</CardTitle>
          <CardDescription>Acompanhamento da produção em relação às metas definidas</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigMonthlyProduction} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={monthlyProductionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} 
                  tickFormatter={(value) => value > 0 ? value.toLocaleString('pt-BR') : ''}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="produced" fill="var(--color-produced)" radius={4} />
                <Bar dataKey="target" fill="var(--color-target)" radius={4} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
