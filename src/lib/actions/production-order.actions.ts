'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ProductionOrder, ProductionOrderFormData, ProductionOrderStatus, SKU } from '@/lib/types';
import { firestoreDb, PRODUCTION_ORDERS_COLLECTION, SKUS_COLLECTION, generateId } from '@/lib/data';
import { collection, doc, addDoc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';

const ProductionOrderSchema = z.object({
  skuId: z.string().min(1, { message: 'SKU é obrigatório.' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantidade deve ser um número.' })
    .int({ message: 'Quantidade deve ser um número inteiro.' })
    .positive({ message: 'Quantidade deve ser maior que zero.' }),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres.').optional(),
});

// Helper para converter dados do Firestore para o tipo ProductionOrder
function mapDocToProductionOrder(docSnap: any): ProductionOrder {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    // startTime e endTime são armazenados como Timestamps ou null/undefined
    startTime: data.startTime instanceof Timestamp ? data.startTime.toMillis() : data.startTime,
    endTime: data.endTime instanceof Timestamp ? data.endTime.toMillis() : data.endTime,
  } as ProductionOrder;
}

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  if (!firestoreDb) throw new Error("Firestore not initialized.");
  const poCollection = collection(firestoreDb, PRODUCTION_ORDERS_COLLECTION);
  const snapshot = await getDocs(poCollection);
  const orders = snapshot.docs.map(mapDocToProductionOrder);
  // Carregar skuCode para cada pedido
  for (const order of orders) {
    if (order.skuId) {
        const skuDoc = await getDoc(doc(firestoreDb, SKUS_COLLECTION, order.skuId));
        if (skuDoc.exists()) {
            order.skuCode = skuDoc.data()?.code || 'N/A';
        } else {
            order.skuCode = 'N/A (Excluído)';
        }
    } else {
        order.skuCode = 'N/A';
    }
  }
  return orders.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getProductionOrderById(id: string): Promise<ProductionOrder | undefined> {
  if (!firestoreDb) throw new Error("Firestore not initialized.");
  const poDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
  const docSnap = await getDoc(poDocRef);
  if (docSnap.exists()) {
    const order = mapDocToProductionOrder(docSnap);
    if (order.skuId) {
        const skuDoc = await getDoc(doc(firestoreDb, SKUS_COLLECTION, order.skuId));
        if (skuDoc.exists()) {
            order.skuCode = skuDoc.data()?.code || 'N/A';
        } else {
            order.skuCode = 'N/A (Excluído)';
        }
    } else {
        order.skuCode = 'N/A';
    }
    return order;
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
  if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };

  const { skuId, quantity, notes } = validatedFields.data;

  const skuDocRef = doc(firestoreDb, SKUS_COLLECTION, skuId);
  const skuSnap = await getDoc(skuDocRef);
  if (!skuSnap.exists()) {
    return {
      errors: { skuId: ['SKU selecionado não é válido ou não existe.'] },
      message: 'Falha ao criar Pedido de Produção. SKU inválido.',
    };
  }
  const skuCode = skuSnap.data()?.code || 'N/A';
  const now = new Date();
  const newOrderData = {
    skuId,
    skuCode, // Denormalizado
    quantity,
    notes: notes || '',
    status: 'open' as ProductionOrderStatus,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
    startTime: null,
    endTime: null,
    totalProductionTime: null,
    deliveredQuantity: null,
    secondsPerUnit: null,
  };

  try {
    const docRef = await addDoc(collection(firestoreDb, PRODUCTION_ORDERS_COLLECTION), newOrderData);
    revalidatePath('/production-orders');
    revalidatePath('/dashboard');
    return { message: 'Pedido de Produção criado com sucesso.', order: { id: docRef.id, ...newOrderData, createdAt: now, updatedAt: now } };
  } catch (error) {
    console.error("Error creating Production Order:", error);
    return { message: 'Erro ao criar Pedido de Produção no banco de dados.', error: true };
  }
}

export async function updateProductionOrder(id: string, formData: ProductionOrderFormData) {
  const validatedFields = ProductionOrderSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao atualizar Pedido de Produção. Verifique os campos.',
    };
  }
  if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };

  const { skuId, quantity, notes } = validatedFields.data;
  const orderDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
  const orderSnap = await getDoc(orderDocRef);

  if (!orderSnap.exists()) {
    return { message: 'Pedido de Produção não encontrado.', error: true };
  }

  const currentOrder = mapDocToProductionOrder(orderSnap);
  const updates: Partial<ProductionOrder> & { updatedAt: Timestamp } = { updatedAt: Timestamp.fromDate(new Date()) };

  if (currentOrder.status === 'open') {
    const skuDocRef = doc(firestoreDb, SKUS_COLLECTION, skuId);
    const skuSnap = await getDoc(skuDocRef);
    if (!skuSnap.exists()) {
      return { errors: { skuId: ['SKU selecionado não é válido ou não existe.'] }, message: 'SKU inválido.' };
    }
    updates.skuId = skuId;
    updates.skuCode = skuSnap.data()?.code || 'N/A';
    updates.quantity = quantity;
  } else if (currentOrder.skuId !== skuId || currentOrder.quantity !== quantity) {
    return { 
        message: 'SKU e Quantidade só podem ser alterados em pedidos com status "Aberta". Apenas observações foram salvas.', 
        // error: true, // Not a full error if notes can be saved
        errors: { 
            skuId: currentOrder.skuId !== skuId ? ['SKU não pode ser alterado.'] : undefined,
            quantity: currentOrder.quantity !== quantity ? ['Quantidade não pode ser alterada.'] : undefined,
         }
    };
  }

  if (notes !== undefined) {
    updates.notes = notes || '';
  }
  
  try {
    await updateDoc(orderDocRef, updates);
    revalidatePath('/production-orders');
    revalidatePath('/dashboard');
    // Return a representation of the updated order; you might want to refetch for full data
    const updatedOrder = { ...currentOrder, ...updates, updatedAt: updates.updatedAt.toDate() };
    if (updates.skuCode) updatedOrder.skuCode = updates.skuCode;
    if (updates.quantity) updatedOrder.quantity = updates.quantity;
    if (updates.notes !== undefined) updatedOrder.notes = updates.notes;

    return { message: 'Pedido de Produção atualizado com sucesso.', order: updatedOrder };
  } catch (error) {
    console.error("Error updating Production Order:", error);
    return { message: 'Erro ao atualizar Pedido de Produção.', error: true };
  }
}

export async function startProductionOrder(id: string) {
  if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };
  const orderDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
  const orderSnap = await getDoc(orderDocRef);

  if (!orderSnap.exists()) return { message: 'Pedido de Produção não encontrado.', error: true };
  const orderData = orderSnap.data();
  if (orderData?.status !== 'open') return { message: 'Apenas pedidos "Abertos" podem ser iniciados.', error: true };

  try {
    await updateDoc(orderDocRef, {
      status: 'in_progress',
      startTime: Timestamp.now(), // Use Firestore Timestamp for consistency
      updatedAt: Timestamp.fromDate(new Date()),
    });
    revalidatePath('/production-orders');
    revalidatePath('/dashboard');
    return { message: 'Pedido de Produção iniciado.' };
  } catch (e) {
    console.error("Error starting PO:", e);
    return { message: 'Erro ao iniciar Pedido de Produção.', error: true };
  }
}

export async function completeProductionOrder(id: string, deliveredQuantity: number) {
  if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };
  const orderDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
  const orderSnap = await getDoc(orderDocRef);

  if (!orderSnap.exists()) return { message: 'Pedido de Produção não encontrado.', error: true };
  const orderData = mapDocToProductionOrder(orderSnap); // Use helper to get JS Date for startTime

  if (orderData.status !== 'in_progress') return { message: 'Apenas pedidos "Em Progresso" podem ser concluídos.', error: true };
  if (typeof deliveredQuantity !== 'number' || !Number.isInteger(deliveredQuantity) || deliveredQuantity < 0) {
    return { message: 'Quantidade entregue fornecida é inválida.', error: true };
  }

  const endTime = Timestamp.now();
  let totalProductionTimeMs: number | null = null;
  let secondsPerUnitVal: number | null = null;

  if (orderData.startTime) { // startTime is a number (ms) from mapDocToProductionOrder
    totalProductionTimeMs = endTime.toMillis() - orderData.startTime;
    if (deliveredQuantity > 0 && totalProductionTimeMs > 0) {
      secondsPerUnitVal = (totalProductionTimeMs / 1000) / deliveredQuantity;
    }
  }

  try {
    await updateDoc(orderDocRef, {
      status: 'completed',
      endTime: endTime,
      totalProductionTime: totalProductionTimeMs,
      deliveredQuantity: deliveredQuantity,
      secondsPerUnit: secondsPerUnitVal,
      updatedAt: Timestamp.fromDate(new Date()),
    });
    revalidatePath('/production-orders');
    revalidatePath('/dashboard');
    revalidatePath('/demand-planning');
    revalidatePath('/performance');
    return { message: `Pedido de Produção concluído com ${deliveredQuantity} unidades entregues.` };
  } catch (e) {
    console.error("Error completing PO:", e);
    return { message: 'Erro ao concluir Pedido de Produção.', error: true };
  }
}

export async function cancelProductionOrder(id: string) {
    if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };
    const orderDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
    const orderSnap = await getDoc(orderDocRef);

    if (!orderSnap.exists()) return { message: 'Pedido de Produção não encontrado.', error: true };
    const orderData = mapDocToProductionOrder(orderSnap);

    if (orderData.status === 'completed' || orderData.status === 'cancelled') {
        return { message: `Pedidos "${orderData.status === 'completed' ? 'Concluídos' : 'Cancelados'}" não podem ser cancelados novamente.`, error: true };
    }
    
    const endTime = Timestamp.now();
    let totalProductionTimeMs: number | null = null;
    if (orderData.startTime) { // startTime is number (ms)
        totalProductionTimeMs = endTime.toMillis() - orderData.startTime;
    }

    try {
        await updateDoc(orderDocRef, {
            status: 'cancelled',
            endTime: endTime,
            totalProductionTime: totalProductionTimeMs,
            updatedAt: Timestamp.fromDate(new Date()),
        });
        revalidatePath('/production-orders');
        revalidatePath('/dashboard');
        return { message: 'Pedido de Produção cancelado.' };
    } catch (e) {
        console.error("Error cancelling PO:", e);
        return { message: 'Erro ao cancelar Pedido de Produção.', error: true };
    }
}

export async function deleteProductionOrder(id: string) {
    if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };
    const orderDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
    const orderSnap = await getDoc(orderDocRef);

    if (!orderSnap.exists()) return { message: 'Pedido de Produção não encontrado.', error: true };
    if (orderSnap.data()?.status === 'in_progress') {
        return { message: 'Pedidos "Em Progresso" não podem ser excluídos.', error: true };
    }
    try {
        await deleteDoc(orderDocRef);
        revalidatePath('/production-orders');
        revalidatePath('/dashboard');
        revalidatePath('/demand-planning');
        revalidatePath('/performance');
        return { message: 'Pedido de Produção excluído com sucesso.' };
    } catch (e) {
        console.error("Error deleting PO:", e);
        return { message: 'Erro ao excluir Pedido de Produção.', error: true };
    }
}

export async function deleteMultipleProductionOrders(ids: string[]) {
  if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };
  if (!ids || ids.length === 0) return { message: 'Nenhum pedido selecionado.', error: true };

  const batch = writeBatch(firestoreDb);
  let deletedCount = 0;
  const inProgressIds: string[] = [];
  const notFoundIds: string[] = [];

  for (const id of ids) {
    const orderDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
    const orderSnap = await getDoc(orderDocRef);
    if (orderSnap.exists()) {
      if (orderSnap.data()?.status === 'in_progress') {
        inProgressIds.push(id);
      } else {
        batch.delete(orderDocRef);
        deletedCount++;
      }
    } else {
      notFoundIds.push(id);
    }
  }

  try {
    await batch.commit();
    let message = '';
    if (deletedCount > 0) {
      message += `${deletedCount} pedido(s) excluído(s). `;
      revalidatePath('/production-orders');
      revalidatePath('/dashboard');
      revalidatePath('/demand-planning');
      revalidatePath('/performance');
    }
    if (inProgressIds.length > 0) {
      message += `${inProgressIds.length} pedido(s) "Em Progresso" não foram excluídos. `;
    }
    if (notFoundIds.length > 0) {
      message += `${notFoundIds.length} pedido(s) não encontrados.`;
    }
     if (message === '') {
      message = 'Nenhuma operação de exclusão foi realizada.';
    }
    return { message: message.trim(), error: inProgressIds.length > 0 || notFoundIds.length > 0 };
  } catch (error) {
    console.error("Error deleting multiple POs:", error);
    return { message: 'Erro ao excluir pedidos em massa.', error: true };
  }
}