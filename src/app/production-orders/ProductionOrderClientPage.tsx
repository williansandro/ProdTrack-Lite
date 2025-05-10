
"use client";

import type { ProductionOrder, SKU, ProductionOrderStatus } from '@/lib/types';
import type { ColumnDef } from "@tanstack/react-table";
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable';
import { ProductionOrderForm } from '@/components/production-orders/ProductionOrderForm';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit3, Trash2, Play, CheckCircle, XCircle, PlusCircle, Info } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  deleteProductionOrder,
  startProductionOrder,
  completeProductionOrder,
  cancelProductionOrder
} from '@/lib/actions/production-order.actions';
import { differenceInSeconds } from 'date-fns';
import { FormattedDateCell } from '@/components/shared/FormattedDateCell';
import { Progress } from '@/components/ui/progress'; // Import Progress component

interface ProductionOrderClientPageProps {
  initialProductionOrders: ProductionOrder[];
  skus: SKU[];
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms === null || ms < 0) return "N/D";
  if (ms === 0) return "0s";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${seconds}s`;
  return result.trim();
}

const statusMap: Record<ProductionOrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline", colorClass: string }> = {
  open: { label: "Aberta", variant: "outline", colorClass: "border-blue-500 text-blue-500" },
  in_progress: { label: "Em Progresso", variant: "outline", colorClass: "border-yellow-500 text-yellow-500 animate-pulse" },
  completed: { label: "Concluída", variant: "outline", colorClass: "border-green-500 text-green-500" },
  cancelled: { label: "Cancelada", variant: "outline", colorClass: "border-red-500 text-red-500" },
};


function TimerCell({ order }: { order: ProductionOrder }) {
  const [elapsedTime, setElapsedTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (order.status === 'in_progress' && order.startTime) {
      const calculateTime = () => differenceInSeconds(new Date(), new Date(order.startTime!)) * 1000;
      setElapsedTime(calculateTime()); // Initial set
      intervalId = setInterval(() => {
        setElapsedTime(calculateTime());
      }, 1000);
    } else if (order.totalProductionTime !== undefined) {
        setElapsedTime(order.totalProductionTime);
    } else {
        setElapsedTime(undefined); // Reset or set to a default state if no time is applicable
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [order.status, order.startTime, order.totalProductionTime]);
  
  if (elapsedTime === undefined && order.status === 'in_progress') {
    return <Badge variant="outline" className="text-muted-foreground">Calculando...</Badge>;
  }

  if (order.status === 'open' || (order.status !== 'in_progress' && elapsedTime === undefined && order.status !== 'completed' && order.status !== 'cancelled')) {
    return <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>;
  }
   if (elapsedTime === undefined && (order.status === 'completed' || order.status === 'cancelled')) {
    return <Badge variant="outline" className="text-muted-foreground">N/D</Badge>;
  }
  
  return <div className="tabular-nums">{formatDuration(elapsedTime)}</div>;
}


export function ProductionOrderClientPage({ initialProductionOrders, skus }: ProductionOrderClientPageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [confirmActionOrder, setConfirmActionOrder] = useState<{ order: ProductionOrder; action: 'delete' | 'start' | 'complete' | 'cancel' } | null>(null);
  const [deliveredQuantity, setDeliveredQuantity] = useState<string>('');
  const { toast } = useToast();

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    setEditingOrder(null);
    // Data revalidation handled by server action
  };

  const openEditForm = (order: ProductionOrder) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const openConfirmDialog = (order: ProductionOrder, action: 'delete' | 'start' | 'complete' | 'cancel') => {
    if (action === 'complete') {
      setDeliveredQuantity(order.quantity.toString()); // Pre-fill with planned quantity
    }
    setConfirmActionOrder({ order, action });
  };


  const handleAction = async () => {
    if (!confirmActionOrder) return;
    const { order, action } = confirmActionOrder;
    let result: { message: string; error?: boolean, errors?: Record<string, string[]> } | undefined;

    try {
      if (action === 'delete') {
        result = await deleteProductionOrder(order.id);
      } else if (action === 'start') {
        result = await startProductionOrder(order.id);
      } else if (action === 'complete') {
        const qty = parseInt(deliveredQuantity, 10);
        if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
          toast({ title: 'Erro de Validação', description: 'Quantidade entregue deve ser um número inteiro não negativo.', variant: 'destructive' });
          return; // Do not close dialog, let user correct
        }
        result = await completeProductionOrder(order.id, qty);
      } else if (action === 'cancel') {
        result = await cancelProductionOrder(order.id);
      }

      if (result?.error) {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
      } else if (result) {
        toast({ title: 'Sucesso', description: result.message });
      }
    } catch (e: any) {
        toast({ title: 'Erro Inesperado', description: e.message || 'Ocorreu um erro.', variant: 'destructive' });
    } finally {
        const isCompleteAction = action === 'complete';
        const hasValidationError = isCompleteAction && (isNaN(parseInt(deliveredQuantity, 10)) || parseInt(deliveredQuantity, 10) < 0 || !Number.isInteger(parseFloat(deliveredQuantity)));
        const hasServerError = result?.error;

        if (!(isCompleteAction && (hasValidationError || hasServerError))) {
           setConfirmActionOrder(null);
        }
        if (isCompleteAction && hasServerError && !hasValidationError) { 
            setConfirmActionOrder(null);
        }
    }
  };
  
  const columns: ColumnDef<ProductionOrder>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID da OP",
      cell: ({ row }) => <div className="truncate w-20 font-mono text-xs">{row.original.id}</div>
    },
    {
      accessorKey: "skuCode",
      header: "SKU",
    },
    {
      accessorKey: "quantity",
      header: "Quantidade",
      cell: ({ row }) => {
        const order = row.original;
        if (order.status === 'completed' && typeof order.deliveredQuantity === 'number' && order.quantity > 0) {
          const percentage = Math.min(100, Math.max(0, (order.deliveredQuantity / order.quantity) * 100));
          let progressColorClass = 'bg-green-500'; // Default to green
          if (percentage <= 33) {
            progressColorClass = 'bg-red-500'; // Use Tailwind red for destructive/low progress
          } else if (percentage <= 66) {
            progressColorClass = 'bg-yellow-500'; // Use Tailwind yellow for medium progress
          }
          
          return (
            <div className="flex flex-col space-y-1 w-40">
              <span>{order.deliveredQuantity} <span className="text-xs text-muted-foreground">entregues</span> ({percentage.toFixed(0)}%)</span>
              <Progress value={percentage} indicatorClassName={progressColorClass} className="h-2"/>
              <span className="text-xs text-muted-foreground">({order.quantity} planejadas)</span>
            </div>
          );
        }
         if (order.status === 'completed' && typeof order.deliveredQuantity === 'number' && order.quantity === 0) {
            return (
                 <div className="flex flex-col">
                    <span>{order.deliveredQuantity} <span className="text-xs text-muted-foreground">entregues</span></span>
                     <span className="text-xs text-muted-foreground">(0 planejadas - N/A %)</span>
                </div>
            );
        }
        return order.quantity;
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusInfo = statusMap[row.original.status];
        return <Badge variant={statusInfo.variant} className={statusInfo.colorClass}>{statusInfo.label}</Badge>;
      },
    },
    {
        accessorKey: "totalProductionTime",
        header: "Tempo de Produção",
        cell: ({ row }) => <TimerCell order={row.original} />,
    },
    {
      accessorKey: "createdAt",
      header: "Criado Em",
      cell: ({ row }) => <FormattedDateCell dateValue={row.original.createdAt} />,
    },
     {
      accessorKey: "notes",
      header: "Observações",
      cell: ({ row }) => <div className="truncate max-w-xs">{row.original.notes || '-'}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;
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
              {order.status === 'open' && (
                <DropdownMenuItem onClick={() => openConfirmDialog(order, 'start')}>
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar Produção
                </DropdownMenuItem>
              )}
              {order.status === 'in_progress' && (
                <DropdownMenuItem onClick={() => openConfirmDialog(order, 'complete')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Concluir Produção
                </DropdownMenuItem>
              )}
               <DropdownMenuItem onClick={() => openEditForm(order)} disabled={order.status === 'cancelled' || order.status === 'completed'}>
                <Edit3 className="mr-2 h-4 w-4" />
                Editar / Ver Detalhes
              </DropdownMenuItem>
              {(order.status === 'open' || order.status === 'in_progress') && (
                <DropdownMenuItem onClick={() => openConfirmDialog(order, 'cancel')} className="text-amber-600 focus:text-amber-700 focus:bg-amber-100">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar Produção
                </DropdownMenuItem>
              )}
              { (order.status !== 'in_progress') && ( 
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openConfirmDialog(order, 'delete')} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [skus]); 

  const getAlertDialogTexts = () => {
    if (!confirmActionOrder) return { title: '', description: '', actionText: '' };
    const { order, action } = confirmActionOrder;
    switch (action) {
      case 'delete':
        return { title: 'Você tem certeza?', description: `Esta ação não pode ser desfeita. Isso excluirá permanentemente o Pedido de Produção para o SKU: ${order.skuCode} (ID: ${order.id}).`, actionText: 'Excluir' };
      case 'start':
        return { title: 'Iniciar Produção?', description: `Você está prestes a iniciar a produção para o SKU: ${order.skuCode} (ID: ${order.id}). O cronômetro será iniciado.`, actionText: 'Iniciar' };
      case 'complete':
        return { 
          title: 'Concluir Produção?', 
          description: `Confirme a quantidade efetivamente produzida e entregue para o SKU: ${order.skuCode} (ID: ${order.id}). A quantidade planejada originalmente foi ${order.quantity}.`, 
          actionText: 'Confirmar Conclusão' 
        };
      case 'cancel':
        return { title: 'Cancelar Produção?', description: `Você está prestes a cancelar a produção para o SKU: ${order.skuCode} (ID: ${order.id}). Esta ação não pode ser desfeita facilmente.`, actionText: 'Cancelar OP', actionVariant: 'destructive' as const };
      default:
        return { title: '', description: '', actionText: '' };
    }
  };

  const dialogTexts = getAlertDialogTexts();


  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Pedidos de Produção</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Criar Nova OP
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Editar Pedido de Produção' : 'Criar Novo Pedido de Produção'}</DialogTitle>
              <DialogDescription>
                {editingOrder ? `Atualize os detalhes do pedido para ${editingOrder.skuCode}.` : 'Preencha os detalhes para o novo Pedido de Produção.'}
                 {editingOrder && editingOrder.status !== 'open' && !(editingOrder.status === 'completed' || editingOrder.status === 'cancelled') && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 flex items-start">
                        <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Pedidos com status diferente de "Aberta" têm campos limitados para edição (apenas Observações).</span>
                    </div>
                 )}
                 {editingOrder && (editingOrder.status === 'completed' || editingOrder.status === 'cancelled') && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 flex items-start">
                        <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Este pedido está {statusMap[editingOrder.status].label.toLowerCase()} e não pode mais ser editado. Apenas visualização.</span>
                    </div>
                 )}
              </DialogDescription>
            </DialogHeader>
            <ProductionOrderForm
                productionOrder={editingOrder}
                skus={skus}
                onFormSubmit={handleFormSubmit}
            />
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
            <DataTable
                columns={columns}
                data={initialProductionOrders}
                filterColumn="skuCode"
                filterPlaceholder="Filtrar por SKU..."
            />
        </CardContent>
      </Card>


      {confirmActionOrder && (
        <AlertDialog open={!!confirmActionOrder} onOpenChange={() => setConfirmActionOrder(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogTexts.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {dialogTexts.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {confirmActionOrder.action === 'complete' && (
              <div className="space-y-2 my-2">
                <Label htmlFor="deliveredQuantityInput" className="text-sm font-medium">Quantidade Entregue</Label>
                <Input
                  id="deliveredQuantityInput"
                  type="number"
                  value={deliveredQuantity}
                  onChange={(e) => setDeliveredQuantity(e.target.value)}
                  placeholder={`Planejado: ${confirmActionOrder.order.quantity}`}
                  className="mt-1"
                />
                 { parseInt(deliveredQuantity, 10) < 0 && <p className="text-sm text-destructive">Quantidade não pode ser negativa.</p>}
                 { !Number.isInteger(parseFloat(deliveredQuantity)) && deliveredQuantity !== '' && parseFloat(deliveredQuantity).toString() === deliveredQuantity && <p className="text-sm text-destructive">Quantidade deve ser um número inteiro.</p>}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmActionOrder(null)}>Voltar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleAction} 
                className={confirmActionOrder.action === 'delete' || confirmActionOrder.action === 'cancel' ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
                 disabled={
                    confirmActionOrder.action === 'complete' && 
                    (
                        isNaN(parseInt(deliveredQuantity, 10)) || 
                        parseInt(deliveredQuantity, 10) < 0 ||
                        (!Number.isInteger(parseFloat(deliveredQuantity)) && deliveredQuantity !== '' && parseFloat(deliveredQuantity).toString() === deliveredQuantity)
                    )
                }
               >
                {dialogTexts.actionText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
