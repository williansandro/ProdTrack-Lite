
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
import { SkuForm } from '@/components/skus/SkuForm';
import { DataTable } from '@/components/shared/DataTable';
import { Edit3, Trash2, MoreHorizontal, Trash, PackagePlus, ListChecks } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { deleteSku, deleteMultipleSkus } from '@/lib/actions/sku.actions';
import { FormattedDateCell } from '@/components/shared/FormattedDateCell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

interface SkuClientPageProps {
  initialSkus: SKU[];
}

export function SkuClientPage({ initialSkus }: SkuClientPageProps) {
  // Note: Dialog for editing is removed, form will be inline or a separate page if complex editing needed
  // For now, SkuForm is used for creation directly in the "Cadastrar Novo SKU" card.
  // Editing could be implemented by navigating to a new page /skus/[id]/edit or using a modal triggered by the edit button.
  // The current SkuForm can accept an 'sku' prop for editing, but its display logic here is simplified.

  const [deletingSku, setDeletingSku] = useState<SKU | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [editingSkuModal, setEditingSkuModal] = useState<SKU | null>(null); // For a modal edit, not used yet

  const { toast } = useToast();

  const handleFormSubmit = () => {
    // This would be called by SkuForm, e.g., to close a dialog if it were used for editing.
    // For the inline creation form, it might just reset the form or give feedback.
  };

  const openEditForm = (sku: SKU) => {
    // For now, this doesn't open a dialog. An edit page or modal would be needed.
    // setEditingSkuModal(sku); // If using an edit modal
    toast({ title: "Editar SKU", description: `Funcionalidade de edição para ${sku.code} a ser implementada.`, variant: "default"});
    console.log("Edit SKU:", sku);
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
      header: "Nome", // Changed from "Descrição"
      cell: ({ row }) => <div className="truncate max-w-xs">{row.original.description}</div>,
    },
    {
      accessorKey: "unitOfMeasure",
      header: "Un. Medida",
      cell: ({ row }) => row.original.unitOfMeasure,
    },
    // CreatedAt and UpdatedAt columns removed as per image
    // {
    //   accessorKey: "createdAt",
    //   header: "Criado Em",
    //   cell: ({ row }) => <FormattedDateCell dateValue={row.original.createdAt} />,
    // },
    // {
    //   accessorKey: "updatedAt",
    //   header: "Atualizado Em",
    //   cell: ({ row }) => <FormattedDateCell dateValue={row.original.updatedAt} />,
    // },
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
          // Dropdown menu removed for direct icon buttons as per image
          // <DropdownMenu>
          //   <DropdownMenuTrigger asChild>
          //     <Button variant="ghost" className="h-8 w-8 p-0">
          //       <span className="sr-only">Abrir menu</span>
          //       <MoreHorizontal className="h-4 w-4" />
          //     </Button>
          //   </DropdownMenuTrigger>
          //   <DropdownMenuContent align="end" className="bg-card border-border">
          //     <DropdownMenuLabel>Ações</DropdownMenuLabel>
          //     <DropdownMenuItem onClick={() => openEditForm(sku)}>
          //       <Edit3 className="mr-2 h-4 w-4" />
          //       Editar
          //     </DropdownMenuItem>
          //     <DropdownMenuItem onClick={() => openDeleteConfirm(sku)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
          //       <Trash2 className="mr-2 h-4 w-4" />
          //       Excluir
          //     </DropdownMenuItem>
          //   </DropdownMenuContent>
          // </DropdownMenu>
        );
      },
    },
  ], []);


  return (
    <div className="space-y-6">
      {/* Section for Creating New SKU */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <PackagePlus className="h-6 w-6 text-accent" />
            <CardTitle className="text-xl font-semibold text-accent">Cadastrar Novo SKU</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <SkuForm onFormSubmit={handleFormSubmit} />
        </CardContent>
      </Card>
      
      {/* Section for Listing SKUs */}
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
            filterColumn="code" // Keep filtering if desired, though not shown in image
            filterPlaceholder="Filtrar por código..." //
            enableRowSelection={true}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            getId={(row) => row.id}
          />
        </CardContent>
      </Card>


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
