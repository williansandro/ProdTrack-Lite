
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ProductionOrder, ProductionOrderFormData, ProductionOrderStatus, SKU } from '@/lib/types';
import { 
  PRODUCTION_ORDERS_COLLECTION, 
  SKUS_COLLECTION, 
  firestoreDb,
  Timestamp 
} from '@/lib/data';
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';

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
    // Ensure skuCode is initialized, it will be populated later if needed
    skuCode: data.skuCode || 'N/A', 
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || Date.now()),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt?.seconds * 1000 || Date.now()),
    startTime: data.startTime instanceof Timestamp ? data.startTime.toMillis() : (typeof data.startTime === 'number' ? data.startTime : null),
    endTime: data.endTime instanceof Timestamp ? data.endTime.toMillis() : (typeof data.endTime === 'number' ? data.endTime : null),
  } as ProductionOrder;
}

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  if (!firestoreDb) {
    console.error("Firestore não inicializado em getProductionOrders. Verifique a configuração do Firebase.");
    return [];
  }
  
  const poCollectionRef = collection(firestoreDb, PRODUCTION_ORDERS_COLLECTION);
  const skusCollectionRef = collection(firestoreDb, SKUS_COLLECTION);

  // Fetch POs and SKUs in parallel
  const [poSnapshot, skusSnapshot] = await Promise.all([
    getDocs(poCollectionRef),
    getDocs(skusCollectionRef)
  ]);

  const skusMap = new Map<string, string>(); // Map SKU ID to SKU Code
  skusSnapshot.docs.forEach(skuDoc => {
    skusMap.set(skuDoc.id, skuDoc.data()?.code || 'N/A');
  });

  const orders = poSnapshot.docs.map(docSnap => {
    const order = mapDocToProductionOrder(docSnap);
    // Populate skuCode using the skusMap
    order.skuCode = order.skuId ? (skusMap.get(order.skuId) || 'N/A (Excluído)') : 'N/A';
    return order;
  });

  return orders.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getProductionOrderById(id: string): Promise<ProductionOrder | undefined> {
  if (!firestoreDb) {
    console.error("Firestore não inicializado em getProductionOrderById. Verifique a configuração do Firebase.");
    return undefined;
  }
  const poDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
  const docSnap = await getDoc(poDocRef);
  if (docSnap.exists()) {
    const order = mapDocToProductionOrder(docSnap);
    if (order.skuId && (!order.skuCode || order.skuCode === 'N/A')) { // Populate skuCode if missing
        const skuDocRef = doc(firestoreDb, SKUS_COLLECTION, order.skuId);
        const skuDoc = await getDoc(skuDocRef);
        if (skuDoc.exists()) {
            order.skuCode = skuDoc.data()?.code || 'N/A';
        } else {
            order.skuCode = 'N/A (Excluído)';
        }
    }
    return order;
  }
  return undefined;
}

export async function createProductionOrder(formData: ProductionOrderFormData) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  const validatedFields = ProductionOrderSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao criar Pedido de Produção. Verifique os campos.',
    };
  }

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
    skuCode, 
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
    return { message: 'Pedido de Produção criado com sucesso.', order: { id: docRef.id, ...newOrderData, createdAt: now, updatedAt: now, startTime: null, endTime: null } };
  } catch (error) {
    console.error("Error creating Production Order in Firestore:", error);
    return { message: 'Erro ao criar Pedido de Produção no banco de dados. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function updateProductionOrder(id: string, formData: ProductionOrderFormData) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  const validatedFields = ProductionOrderSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao atualizar Pedido de Produção. Verifique os campos.',
    };
  }

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
     if (notes !== undefined && currentOrder.notes !== (notes || '')) {
        updates.notes = notes || '';
     } else { 
        return { 
            message: 'SKU e Quantidade só podem ser alterados em pedidos "Abertos". Nenhuma alteração foi salva ou apenas observações foram salvas.', 
            errors: { 
                skuId: currentOrder.skuId !== skuId ? ['SKU não pode ser alterado.'] : undefined,
                quantity: currentOrder.quantity !== quantity ? ['Quantidade não pode ser alterada.'] : undefined,
            }
        };
     }
  }
  
  if (notes !== undefined) { 
    updates.notes = notes || '';
  }
  
  try {
    await updateDoc(orderDocRef, updates as any); // Use 'as any' to bypass strict type checking for partial updates if necessary
    revalidatePath('/production-orders');
    revalidatePath('/dashboard');
    
    const updatedOrderDoc = await getDoc(orderDocRef); 
    const finalUpdatedOrder = mapDocToProductionOrder(updatedOrderDoc);

    return { message: 'Pedido de Produção atualizado com sucesso.', order: finalUpdatedOrder };
  } catch (error) {
    console.error("Error updating Production Order in Firestore:", error);
    return { message: 'Erro ao atualizar Pedido de Produção. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function startProductionOrder(id: string) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  const orderDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
  const orderSnap = await getDoc(orderDocRef);

  if (!orderSnap.exists()) return { message: 'Pedido de Produção não encontrado.', error: true };
  const orderData = orderSnap.data();
  if (orderData?.status !== 'open') return { message: 'Apenas pedidos "Abertos" podem ser iniciados.', error: true };

  try {
    await updateDoc(orderDocRef, {
      status: 'in_progress',
      startTime: Timestamp.now(), 
      updatedAt: Timestamp.fromDate(new Date()),
    });
    revalidatePath('/production-orders');
    revalidatePath('/dashboard');
    return { message: 'Pedido de Produção iniciado.' };
  } catch (e) {
    console.error("Error starting PO in Firestore:", e);
    return { message: 'Erro ao iniciar Pedido de Produção. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function completeProductionOrder(id: string, deliveredQuantity: number) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  const orderDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
  const orderSnap = await getDoc(orderDocRef);

  if (!orderSnap.exists()) return { message: 'Pedido de Produção não encontrado.', error: true };
  const orderData = mapDocToProductionOrder(orderSnap); 

  if (orderData.status !== 'in_progress') return { message: 'Apenas pedidos "Em Progresso" podem ser concluídos.', error: true };
  if (typeof deliveredQuantity !== 'number' || !Number.isInteger(deliveredQuantity) || deliveredQuantity < 0) {
    return { message: 'Quantidade entregue fornecida é inválida.', error: true };
  }

  const endTimeMs = Date.now(); 
  let totalProductionTimeMs: number | null = null;
  let secondsPerUnitVal: number | null = null;

  if (orderData.startTime) { 
    totalProductionTimeMs = endTimeMs - orderData.startTime; 
    if (deliveredQuantity > 0 && totalProductionTimeMs > 0) {
      secondsPerUnitVal = (totalProductionTimeMs / 1000) / deliveredQuantity;
    }
  }

  try {
    await updateDoc(orderDocRef, {
      status: 'completed',
      endTime: Timestamp.fromMillis(endTimeMs), 
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
    console.error("Error completing PO in Firestore:", e);
    return { message: 'Erro ao concluir Pedido de Produção. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function cancelProductionOrder(id: string) {
    if (!firestoreDb) {
      return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
    }
    const orderDocRef = doc(firestoreDb, PRODUCTION_ORDERS_COLLECTION, id);
    const orderSnap = await getDoc(orderDocRef);

    if (!orderSnap.exists()) return { message: 'Pedido de Produção não encontrado.', error: true };
    const orderData = mapDocToProductionOrder(orderSnap);

    if (orderData.status === 'completed' || orderData.status === 'cancelled') {
        return { message: `Pedidos "${orderData.status === 'completed' ? 'Concluídos' : 'Cancelados'}" não podem ser cancelados novamente.`, error: true };
    }
    
    const endTimeMs = Date.now();
    let totalProductionTimeMs: number | null = null;
    if (orderData.startTime) { 
        totalProductionTimeMs = endTimeMs - orderData.startTime;
    }

    try {
        await updateDoc(orderDocRef, {
            status: 'cancelled',
            endTime: Timestamp.fromMillis(endTimeMs),
            totalProductionTime: totalProductionTimeMs,
            updatedAt: Timestamp.fromDate(new Date()),
        });
        revalidatePath('/production-orders');
        revalidatePath('/dashboard');
        return { message: 'Pedido de Produção cancelado.' };
    } catch (e) {
        console.error("Error cancelling PO in Firestore:", e);
        return { message: 'Erro ao cancelar Pedido de Produção. Verifique a conexão e as permissões do Firebase.', error: true };
    }
}

export async function deleteProductionOrder(id: string) {
    if (!firestoreDb) {
      return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
    }
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
        console.error("Error deleting PO from Firestore:", e);
        return { message: 'Erro ao excluir Pedido de Produção. Verifique a conexão e as permissões do Firebase.', error: true };
    }
}

export async function deleteMultipleProductionOrders(ids: string[]) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
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
    console.error("Error deleting multiple POs from Firestore:", error);
    return { message: 'Erro ao excluir pedidos em massa. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}


    