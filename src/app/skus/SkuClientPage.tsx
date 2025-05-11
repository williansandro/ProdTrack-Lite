
"use client";

import type { SKU } from '@/lib/types';
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Will not be used directly, Dialog open state managed by isEditFormOpen
} from '@/components/ui/dialog';
import { SkuForm } from '@/components/skus/SkuForm';
import { DataTable } from '@/components/shared/DataTable';
import { Edit3, Trash2, MoreHorizontal, Trash, PackagePlus, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteSku, deleteMultipleSkus } from '@/lib/actions/sku.actions';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

interface SkuClientPageProps {
  initialSkus: SKU[];
}

export function SkuClientPage({ initialSkus }: SkuClientPageProps) {
  const [deletingSku, setDeletingSku] = useState<SKU | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const { toast } = useToast();

  const handleCreateFormSubmit = () => {
    // This is for the inline creation form, might reset or give feedback.
    // The edit form dialog will handle its own closing via onFormSubmit prop in SkuForm
  };

  const handleEditFormSubmit = () => {
    setIsEditFormOpen(false);
    setEditingSku(null);
    // Data revalidation handled by server action in SkuForm
  };

  const openEditForm = (sku: SKU) => {
    setEditingSku(sku);
    setIsEditFormOpen(true);
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
      setRowSelection({}); 
    }
    setIsBulkDeleteConfirmOpen(false);
  };
  
  const columns: ColumnDef<SKU>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: "Código",
      cell: ({ row }) => <span className="text-primary-dark font-medium">{row.original.code}</span>,
    },
    {
      accessorKey: "description",
      header: "Nome", 
      cell: ({ row }) => <div className="truncate max-w-xs">{row.original.description}</div>,
    },
    {
      accessorKey: "unitOfMeasure",
      header: "Un. Medida",
      cell: ({ row }) => row.original.unitOfMeasure,
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const sku = row.original;
        return (
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={() => openEditForm(sku)} className="text-accent hover:text-accent-foreground">
              <Edit3 className="h-4 w-4" />
              <span className="sr-only">Editar</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(sku)} className="text-destructive hover:text-destructive-foreground">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Excluir</span>
            </Button>
          </div>
        );
      },
    },
  ], []);


  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <PackagePlus className="h-6 w-6 text-accent" />
            <CardTitle className="text-xl font-semibold text-accent">Cadastrar Novo SKU</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <SkuForm onFormSubmit={handleCreateFormSubmit} />
        </CardContent>
      </Card>
      
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ListChecks className="h-6 w-6 text-accent" />
              <CardTitle className="text-xl font-semibold text-accent">SKUs Cadastrados</CardTitle>
            </div>
            {selectedSkuIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                disabled={selectedSkuIds.length === 0}
                size="sm"
              >
                <Trash className="mr-2 h-4 w-4" />
                Excluir Selecionados ({selectedSkuIds.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Edit SKU Dialog */}
      <Dialog open={isEditFormOpen} onOpenChange={(open) => { setIsEditFormOpen(open); if(!open) setEditingSku(null); }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-accent">Editar SKU</DialogTitle>
            <DialogDescription>
              Atualize os detalhes do SKU {editingSku?.code}.
            </DialogDescription>
          </DialogHeader>
          {editingSku && (
            <SkuForm
              sku={editingSku}
              onFormSubmit={handleEditFormSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      {deletingSku && (
        <AlertDialog open={!!deletingSku} onOpenChange={() => setDeletingSku(null)}>
          <AlertDialogContent className="bg-card border-border">
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
          <AlertDialogContent className="bg-card border-border">
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
