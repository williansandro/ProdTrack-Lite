
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ProductionOrder, ProductionOrderFormData, ProductionOrderStatus, SKU } from '@/lib/types';
import { db, generateId } from '@/lib/data'; // Using the mock db

const ProductionOrderSchema = z.object({
  skuId: z.string().min(1, { message: 'SKU é obrigatório.' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantidade deve ser um número.' })
    .int({ message: 'Quantidade deve ser um número inteiro.' })
    .positive({ message: 'Quantidade deve ser maior que zero.' }),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres.').optional(),
});

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
  // Ensure related SKU code is up-to-date if it can change
  return [...db.productionOrders].map(po => {
    const sku = db.skus.find(s => s.id === po.skuId);
    return { ...po, skuCode: sku?.code || 'N/A' };
  }).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getProductionOrderById(id: string): Promise<ProductionOrder | undefined> {
  await new Promise(resolve => setTimeout(resolve, 100));
  const po = db.productionOrders.find(order => order.id === id);
  if (po) {
    const sku = db.skus.find(s => s.id === po.skuId);
    return { ...po, skuCode: sku?.code || 'N/A' };
  }
  return undefined;
}

export async function createProductionOrder(formData: ProductionOrderFormData) {
  const validatedFields = ProductionOrderSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao criar Pedido de Produção. Verifique os campos.',
    };
  }

  const { skuId, quantity, notes } = validatedFields.data;

  const sku = db.skus.find(s => s.id === skuId);
  if (!sku) {
    return {
      errors: { skuId: ['SKU selecionado não é válido.'] },
      message: 'Falha ao criar Pedido de Produção. SKU inválido.',
    };
  }

  const newOrder: ProductionOrder = {
    id: generateId('po'),
    skuId,
    skuCode: sku.code,
    quantity,
    notes: notes || '',
    status: 'open' as ProductionOrderStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.productionOrders.unshift(newOrder);

  revalidatePath('/production-orders');
  return { message: 'Pedido de Produção criado com sucesso.', order: newOrder };
}

export async function updateProductionOrder(id: string, formData: ProductionOrderFormData) {
  const validatedFields = ProductionOrderSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao atualizar Pedido de Produção. Verifique os campos.',
    };
  }

  const { skuId, quantity, notes } = validatedFields.data;
  const orderIndex = db.productionOrders.findIndex(order => order.id === id);

  if (orderIndex === -1) {
    return { message: 'Pedido de Produção não encontrado.', error: true };
  }

  const sku = db.skus.find(s => s.id === skuId);
  if (!sku) {
    return {
      errors: { skuId: ['SKU selecionado não é válido.'] },
      message: 'Falha ao atualizar Pedido de Produção. SKU inválido.',
    };
  }
  
  const currentOrder = db.productionOrders[orderIndex];
  // Prevent editing of quantity/SKU if order is not 'open'
  if (currentOrder.status !== 'open' && (currentOrder.skuId !== skuId || currentOrder.quantity !== quantity)) {
     return { 
        message: 'SKU e Quantidade só podem ser alterados em pedidos com status "Aberta".', 
        error: true,
        errors: { 
            skuId: currentOrder.skuId !== skuId ? ['SKU não pode ser alterado para pedidos já iniciados.'] : undefined,
            quantity: currentOrder.quantity !== quantity ? ['Quantidade não pode ser alterada para pedidos já iniciados.'] : undefined,
         }
    };
  }


  db.productionOrders[orderIndex] = {
    ...db.productionOrders[orderIndex],
    skuId,
    skuCode: sku.code,
    quantity,
    notes: notes || db.productionOrders[orderIndex].notes,
    updatedAt: new Date(),
  };

  revalidatePath('/production-orders');
  return { message: 'Pedido de Produção atualizado com sucesso.', order: db.productionOrders[orderIndex] };
}

export async function startProductionOrder(id: string) {
  const orderIndex = db.productionOrders.findIndex(order => order.id === id);
  if (orderIndex === -1) {
    return { message: 'Pedido de Produção não encontrado.', error: true };
  }
  if (db.productionOrders[orderIndex].status !== 'open') {
    return { message: 'Apenas pedidos "Abertos" podem ser iniciados.', error: true };
  }
  db.productionOrders[orderIndex].status = 'in_progress';
  db.productionOrders[orderIndex].startTime = Date.now();
  db.productionOrders[orderIndex].updatedAt = new Date();
  revalidatePath('/production-orders');
  return { message: 'Pedido de Produção iniciado.' };
}

export async function completeProductionOrder(id: string) {
  const orderIndex = db.productionOrders.findIndex(order => order.id === id);
  if (orderIndex === -1) {
    return { message: 'Pedido de Produção não encontrado.', error: true };
  }
  const order = db.productionOrders[orderIndex];
  if (order.status !== 'in_progress') {
    return { message: 'Apenas pedidos "Em Progresso" podem ser concluídos.', error: true };
  }
  order.status = 'completed';
  order.endTime = Date.now();
  order.totalProductionTime = order.endTime - (order.startTime || order.endTime); // ensure startTime exists
  order.updatedAt = new Date();
  revalidatePath('/production-orders');
  return { message: 'Pedido de Produção concluído.' };
}

export async function cancelProductionOrder(id: string) {
  const orderIndex = db.productionOrders.findIndex(order => order.id === id);
  if (orderIndex === -1) {
    return { message: 'Pedido de Produção não encontrado.', error: true };
  }
  const order = db.productionOrders[orderIndex];
  if (order.status === 'completed' || order.status === 'cancelled') {
     return { message: `Pedidos "${order.status === 'completed' ? 'Concluídos' : 'Cancelados'}" não podem ser cancelados novamente.`, error: true };
  }
  order.status = 'cancelled';
  order.endTime = Date.now(); // Mark end time for cancellation as well
  if (order.startTime) { // If it was started, calculate time spent before cancellation
    order.totalProductionTime = order.endTime - order.startTime;
  }
  order.updatedAt = new Date();
  revalidatePath('/production-orders');
  return { message: 'Pedido de Produção cancelado.' };
}

export async function deleteProductionOrder(id: string) {
  const orderIndex = db.productionOrders.findIndex(order => order.id === id);
  if (orderIndex === -1) {
    return { message: 'Pedido de Produção não encontrado.', error: true };
  }
  // Optional: Add checks if order can be deleted based on status (e.g., not if 'in_progress')
  // For this example, we allow deletion regardless of status after confirmation.
  db.productionOrders.splice(orderIndex, 1);
  revalidatePath('/production-orders');
  return { message: 'Pedido de Produção excluído com sucesso.' };
}
