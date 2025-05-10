
"use client";

import type { DemandWithProgress, SKU } from '@/lib/types';
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from '@/components/shared/DataTable';
import { DemandForm } from '@/components/demand-planning/DemandForm';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, Edit3, Trash2, PlusCircle, CalendarDays, Trash } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { deleteDemand, deleteMultipleDemands } from '@/lib/actions/demand.actions';
import { FormattedDateCell } from '@/components/shared/FormattedDateCell';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DemandClientPageProps {
  initialDemands: DemandWithProgress[];
  skus: SKU[];
}

function formatMonthYear(monthYear: string): string {
  try {
    const date = parse(monthYear, 'yyyy-MM', new Date());
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  } catch (e) {
    return monthYear; // Fallback
  }
}

export function DemandClientPage({ initialDemands, skus }: DemandClientPageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<DemandWithProgress | null>(null);
  const [deletingDemand, setDeletingDemand] = useState<DemandWithProgress | null>(null);
  const [demandsToDelete, setDemandsToDelete] = useState<DemandWithProgress[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { toast } = useToast();

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    setEditingDemand(null);
    // Data revalidation handled by server action
  };

  const openEditForm = (demand: DemandWithProgress) => {
    setEditingDemand(demand);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (demand: DemandWithProgress) => {
    setDeletingDemand(demand);
  };

  const handleDelete = async () => {
    if (!deletingDemand) return;
    const result = await deleteDemand(deletingDemand.id);
    if (result.error) {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    } else {
        toast({ title: 'Sucesso', description: result.message });
    }
    setDeletingDemand(null);
  };

  const selectedDemandIds = useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key]);
  }, [rowSelection, initialDemands]);


  const handleBulkDelete = async () => {
    if (selectedDemandIds.length === 0) {
      toast({ title: 'Nenhuma demanda selecionada', description: 'Selecione demandas para excluir.', variant: 'destructive' });
      return;
    }
    const result = await deleteMultipleDemands(selectedDemandIds);
    if (result.error) {
      toast({ title: 'Erro na Exclusão em Massa', description: result.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: result.message });
      setRowSelection({}); // Clear selection
    }
    setIsBulkDeleteConfirmOpen(false);
  };
  
  const columns: ColumnDef<DemandWithProgress>[] = useMemo(() => [
    {
      accessorKey: "skuCode",
      header: "SKU",
    },
    {
      accessorKey: "monthYear",
      header: () => <div className="flex items-center"><CalendarDays className="mr-1 h-4 w-4 text-muted-foreground" /> Mês/Ano</div>,
      cell: ({ row }) => formatMonthYear(row.original.monthYear),
    },
    {
      accessorKey: "targetQuantity",
      header: "Meta (Und.)",
       cell: ({ row }) => row.original.targetQuantity.toLocaleString('pt-BR'),
    },
    {
      accessorKey: "producedQuantity",
      header: "Produzido (Und.)",
      cell: ({ row }) => row.original.producedQuantity.toLocaleString('pt-BR'),
    },
    {
      accessorKey: "progressPercentage",
      header: "Progresso",
      cell: ({ row }) => {
        const demand = row.original;
        const percentage = demand.progressPercentage;
        let progressColorClass = 'bg-green-500'; 
        if (percentage < 33) progressColorClass = 'bg-red-500';
        else if (percentage < 66) progressColorClass = 'bg-yellow-500';
        
        return (
          <div className="flex flex-col space-y-1 w-40">
            <span>{percentage.toFixed(0)}%</span>
            <Progress value={percentage} indicatorClassName={progressColorClass} className="h-2"/>
          </div>
        );
      }
    },
    {
      accessorKey: "createdAt",
      header: "Criado Em",
      cell: ({ row }) => <FormattedDateCell dateValue={row.original.createdAt} />,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const demand = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openEditForm(demand)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDeleteConfirm(demand)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [skus]);


  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Planejamento de Demanda</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) setEditingDemand(null); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Definir Nova Demanda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDemand ? 'Editar Demanda Mensal' : 'Definir Nova Demanda Mensal'}</DialogTitle>
              <DialogDescription>
                {editingDemand ? `Atualize os detalhes da demanda para ${editingDemand.skuCode} em ${formatMonthYear(editingDemand.monthYear)}.` : 'Preencha os detalhes para a nova demanda mensal.'}
              </DialogDescription>
            </DialogHeader>
            <DemandForm
                demand={editingDemand}
                skus={skus}
                onFormSubmit={handleFormSubmit}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {selectedDemandIds.length > 0 && (
        <div className="flex items-center justify-start space-x-2 my-4">
          <Button
            variant="destructive"
            onClick={() => setIsBulkDeleteConfirmOpen(true)}
            disabled={selectedDemandIds.length === 0}
          >
            <Trash className="mr-2 h-4 w-4" />
            Excluir {selectedDemandIds.length} Demanda(s) Selecionada(s)
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Metas Mensais</CardTitle>
        </CardHeader>
        <CardContent>
            <DataTable
                columns={columns}
                data={initialDemands}
                filterColumn="skuCode"
                filterPlaceholder="Filtrar por SKU..."
                enableRowSelection={true}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                getId={(row) => row.id}
            />
        </CardContent>
      </Card>

      {deletingDemand && (
        <AlertDialog open={!!deletingDemand} onOpenChange={() => setDeletingDemand(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a demanda para o SKU <strong>{deletingDemand.skuCode}</strong> no mês de <strong>{formatMonthYear(deletingDemand.monthYear)}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingDemand(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isBulkDeleteConfirmOpen && (
        <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja excluir as <strong>{selectedDemandIds.length}</strong> demandas selecionadas? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Excluir Selecionadas
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
