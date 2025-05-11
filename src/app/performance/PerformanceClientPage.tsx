
"use client";

import type { PerformanceSkuData } from '@/lib/types';
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from '@/components/shared/DataTable';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ListChecks } from 'lucide-react';

interface PerformanceClientPageProps {
  performanceData: PerformanceSkuData[];
}

export function PerformanceClientPage({ performanceData }: PerformanceClientPageProps) {
  const columns: ColumnDef<PerformanceSkuData>[] = [
    {
      accessorKey: "skuCode",
      header: "Código SKU",
      cell: ({ row }) => <span className="font-medium">{row.original.skuCode}</span>,
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => <div className="truncate max-w-xs">{row.original.description}</div>,
    },
    {
      accessorKey: "totalProduced",
      header: "Total Produzido (Und.)",
      cell: ({ row }) => row.original.totalProduced.toLocaleString('pt-BR'),
    },
    {
      accessorKey: "percentageOfTotal",
      header: "% do Total",
      cell: ({ row }) => `${row.original.percentageOfTotal.toFixed(2)}%`,
    },
    {
      accessorKey: "cumulativePercentage",
      header: "% Acumulada",
      cell: ({ row }) => `${row.original.cumulativePercentage.toFixed(2)}%`,
    },
    {
      accessorKey: "abcCategory",
      header: "Categoria ABC",
      cell: ({ row }) => {
        const category = row.original.abcCategory;
        let variant: "default" | "secondary" | "destructive" = "secondary";
        if (category === 'A') variant = 'default'; // Primary color for 'A'
        if (category === 'C') variant = 'destructive'; // Muted/destructive for 'C'
        
        let colorClass = "border-gray-500 text-gray-500";
        if (category === 'A') colorClass = "border-green-500 text-green-500 bg-green-500/10";
        else if (category === 'B') colorClass = "border-yellow-500 text-yellow-500 bg-yellow-500/10";
        else if (category === 'C') colorClass = "border-red-500 text-red-500 bg-red-500/10";

        return <Badge variant="outline" className={`font-semibold ${colorClass}`}>{category}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <TrendingUp className="mr-3 h-8 w-8 text-primary" />
          Análise de Desempenho de Produção (Curva ABC)
        </h1>
      </div>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
           <div className="flex items-center space-x-2">
             <ListChecks className="h-6 w-6 text-accent" />
             <CardTitle className="text-xl font-semibold text-accent">Ranking de SKUs por Produção</CardTitle>
           </div>
          <CardDescription>
            SKUs classificados pela sua contribuição no volume total de produção. A categoria 'A' representa os itens de maior impacto, 'B' os intermediários, e 'C' os de menor impacto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={performanceData}
            filterColumn="skuCode"
            filterPlaceholder="Filtrar por código SKU..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
