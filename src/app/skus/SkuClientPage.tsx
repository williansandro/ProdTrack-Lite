
"use client";

import type { SKU } from '@/lib/types';
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useState, useMemo } from 'react';
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
import { SkuForm } from '@/components/skus/SkuForm';
import { DataTable } from '@/components/shared/DataTable';
import { PlusCircle, Edit3, Trash2, MoreHorizontal, Trash } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { deleteSku, deleteMultipleSkus } from '@/lib/actions/sku.actions';
import { FormattedDateCell } from '@/components/shared/FormattedDateCell';


interface SkuClientPageProps {
  initialSkus: SKU[];
}

export function SkuClientPage({ initialSkus }: SkuClientPageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [deletingSku, setDeletingSku] = useState<SKU | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const { toast } = useToast();

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    setEditingSku(null);
  };

  const openEditForm = (sku: SKU) => {
    setEditingSku(sku);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (sku: SKU) => {
    setDeletingSku(sku);
  };

  const handleDelete = async () => {
    if (!deletingSku) return;
    const result = await deleteSku(deletingSku.id);
    if (result.error) {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    } else {
        toast({ title: 'Sucesso', description: result.message });
    }
    setDeletingSku(null);
  };

  const selectedSkuIds = useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key]);
  }, [rowSelection]);
  
  const handleBulkDelete = async () => {
    if (selectedSkuIds.length === 0) {
      toast({ title: 'Nenhum SKU selecionado', description: 'Selecione SKUs para excluir.', variant: 'destructive' });
      return;
    }
    const result = await deleteMultipleSkus(selectedSkuIds);
    if (result.error) {
      toast({ title: 'Erro na Exclusão em Massa', description: result.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: result.message });
      setRowSelection({}); // Clear selection
    }
    setIsBulkDeleteConfirmOpen(false);
  };
  
  const columns: ColumnDef<SKU>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: "Código",
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => <div className="truncate max-w-xs">{row.original.description}</div>,
    },
    {
      accessorKey: "createdAt",
      header: "Criado Em",
      cell: ({ row }) => <FormattedDateCell dateValue={row.original.createdAt} />,
    },
    {
      accessorKey: "updatedAt",
      header: "Atualizado Em",
      cell: ({ row }) => <FormattedDateCell dateValue={row.original.updatedAt} />,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const sku = row.original;
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
              <DropdownMenuItem onClick={() => openEditForm(sku)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDeleteConfirm(sku)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de SKUs</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) setEditingSku(null); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Novo SKU
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingSku ? 'Editar SKU' : 'Criar Novo SKU'}</DialogTitle>
              <DialogDescription>
                {editingSku ? 'Atualize os detalhes deste SKU.' : 'Preencha os detalhes para o novo SKU.'}
              </DialogDescription>
            </DialogHeader>
            <SkuForm sku={editingSku} onFormSubmit={handleFormSubmit} />
          </DialogContent>
        </Dialog>
      </div>

      {selectedSkuIds.length > 0 && (
        <div className="flex items-center justify-start space-x-2 my-4">
          <Button
            variant="destructive"
            onClick={() => setIsBulkDeleteConfirmOpen(true)}
            disabled={selectedSkuIds.length === 0}
          >
            <Trash className="mr-2 h-4 w-4" />
            Excluir {selectedSkuIds.length} SKU(s) Selecionado(s)
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={initialSkus}
        filterColumn="code"
        filterPlaceholder="Filtrar por código..."
        enableRowSelection={true}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getId={(row) => row.id}
      />

      {deletingSku && (
        <AlertDialog open={!!deletingSku} onOpenChange={() => setDeletingSku(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o SKU: <strong>{deletingSku.code}</strong>. SKUs em uso em Pedidos de Produção ou Demandas não podem ser excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingSku(null)}>Cancelar</AlertDialogCancel>
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
                Você tem certeza que deseja excluir os <strong>{selectedSkuIds.length}</strong> SKU(s) selecionado(s)? Esta ação não pode ser desfeita. SKUs em uso em Pedidos de Produção ou Demandas não serão excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Excluir Selecionados
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
