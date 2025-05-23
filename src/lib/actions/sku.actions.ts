'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SKU, SkuFormData } from '@/lib/types';
import { 
  SKUS_COLLECTION, 
  PRODUCTION_ORDERS_COLLECTION, 
  DEMANDS_COLLECTION,
  firestoreDb, // Import firestoreDb
  generateId, 
  Timestamp 
} from '@/lib/data'; // generateId e Timestamp são de @/lib/data
import { collection, doc, addDoc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';

const SkuSchema = z.object({
  code: z.string().min(1, { message: 'Código é obrigatório.' }).max(50),
  description: z.string().min(1, { message: 'Descrição é obrigatória.' }).max(255),
  unitOfMeasure: z.string().min(1, { message: 'Unidade de Medida é obrigatória.' }).max(10, 'Un. Medida deve ter 10 caracteres ou menos'),
});

// Helper para converter dados do Firestore para o tipo SKU (com Datas)
function mapDocToSku(docSnap: any): SKU {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || Date.now()),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt?.seconds * 1000 || Date.now()),
  } as SKU;
}

export async function getSkus(): Promise<SKU[]> {
  if (!firestoreDb) {
    console.error("Firestore não inicializado em getSkus. Verifique a configuração do Firebase.");
    return [];
  }
  const skusCollectionRef = collection(firestoreDb, SKUS_COLLECTION);
  const snapshot = await getDocs(skusCollectionRef);
  const skus = snapshot.docs.map(mapDocToSku);
  return skus.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getSkuById(id: string): Promise<SKU | undefined> {
  if (!firestoreDb) {
    console.error("Firestore não inicializado em getSkuById. Verifique a configuração do Firebase.");
    return undefined;
  }
  const skuDocRef = doc(firestoreDb, SKUS_COLLECTION, id);
  const docSnap = await getDoc(skuDocRef);
  if (docSnap.exists()) {
    return mapDocToSku(docSnap);
  }
  return undefined;
}

export async function createSku(formData: SkuFormData) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  const validatedFields = SkuSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao criar SKU. Verifique os campos.',
    };
  }
  
  const { code, description, unitOfMeasure } = validatedFields.data;

  const q = query(collection(firestoreDb, SKUS_COLLECTION), where("code", "==", code));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return {
      errors: { code: ['Este código de SKU já existe.'] },
      message: 'Falha ao criar SKU. Código já em uso.',
    };
  }

  const now = new Date();
  const newSkuData = {
    code,
    description,
    unitOfMeasure,
    createdAt: Timestamp.fromDate(now), // Use Firestore Timestamp
    updatedAt: Timestamp.fromDate(now), // Use Firestore Timestamp
  };

  try {
    // Firestore irá gerar o ID automaticamente com addDoc
    const docRef = await addDoc(collection(firestoreDb, SKUS_COLLECTION), newSkuData);
    revalidatePath('/skus');
    revalidatePath('/production-orders'); 
    revalidatePath('/demand-planning'); 
    revalidatePath('/dashboard'); 
    return { message: 'SKU criado com sucesso.', sku: { id: docRef.id, ...newSkuData, createdAt: now, updatedAt: now } };
  } catch (error) {
    console.error("Error creating SKU in Firestore:", error);
    return { message: 'Erro ao criar SKU no banco de dados. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function updateSku(id: string, formData: SkuFormData) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  const validatedFields = SkuSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao atualizar SKU. Verifique os campos.',
    };
  }
  
  const { code, description, unitOfMeasure } = validatedFields.data;
  const skuDocRef = doc(firestoreDb, SKUS_COLLECTION, id);

  const q = query(collection(firestoreDb, SKUS_COLLECTION), where("code", "==", code));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty && querySnapshot.docs.some(docSnap => docSnap.id !== id)) {
    return {
      errors: { code: ['Este código de SKU já é usado por outro SKU.'] },
      message: 'Falha ao atualizar SKU. Conflito de código.',
    };
  }
  
  const updatedSkuData = {
    code,
    description,
    unitOfMeasure,
    updatedAt: Timestamp.fromDate(new Date()), // Use Firestore Timestamp
  };

  try {
    await setDoc(skuDocRef, updatedSkuData, { merge: true }); 
    revalidatePath('/skus');
    revalidatePath('/production-orders');
    revalidatePath('/demand-planning');
    revalidatePath('/dashboard');
    
    // Para retornar o SKU completo, você precisaria buscar o createdAt original ou o documento inteiro
    const originalSku = await getSkuById(id); // Re-fetch to get consistent data
    return { 
        message: 'SKU atualizado com sucesso.', 
        sku: { 
            id, 
            ...updatedSkuData, 
            createdAt: originalSku?.createdAt || new Date(), // Use fetched createdAt
            updatedAt: updatedSkuData.updatedAt.toDate() 
        } 
    };
  } catch (error) {
    console.error("Error updating SKU in Firestore:", error);
    return { message: 'Erro ao atualizar SKU no banco de dados. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function deleteSku(id: string) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }

  const poQuery = query(collection(firestoreDb, PRODUCTION_ORDERS_COLLECTION), where("skuId", "==", id));
  const demandQuery = query(collection(firestoreDb, DEMANDS_COLLECTION), where("skuId", "==", id));
  
  const [poSnapshot, demandSnapshot] = await Promise.all([getDocs(poQuery), getDocs(demandQuery)]);

  if (!poSnapshot.empty || !demandSnapshot.empty) {
    return { message: 'O SKU não pode ser excluído porque é usado em pedidos de produção ou planos de demanda.', error: true };
  }

  try {
    await deleteDoc(doc(firestoreDb, SKUS_COLLECTION, id));
    revalidatePath('/skus');
    revalidatePath('/production-orders');
    revalidatePath('/demand-planning');
    revalidatePath('/dashboard');
    return { message: 'SKU excluído com sucesso.' };
  } catch (error) {
    console.error("Error deleting SKU from Firestore:", error);
    return { message: 'Erro ao excluir SKU no banco de dados. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function deleteMultipleSkus(ids: string[]) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  if (!ids || ids.length === 0) {
    return { message: 'Nenhum SKU selecionado para exclusão.', error: true };
  }

  const batch = writeBatch(firestoreDb);
  let deletedCount = 0;
  let inUseCount = 0;
  const notFoundIds: string[] = [];

  for (const id of ids) {
    const skuDocRef = doc(firestoreDb, SKUS_COLLECTION, id);
    const skuSnap = await getDoc(skuDocRef);

    if (skuSnap.exists()) {
      const poQuery = query(collection(firestoreDb, PRODUCTION_ORDERS_COLLECTION), where("skuId", "==", id));
      const demandQuery = query(collection(firestoreDb, DEMANDS_COLLECTION), where("skuId", "==", id));
      const [poSnapshot, demandSnapshot] = await Promise.all([getDocs(poQuery), getDocs(demandQuery)]);

      if (!poSnapshot.empty || !demandSnapshot.empty) {
        inUseCount++;
      } else {
        batch.delete(skuDocRef);
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
      message += `${deletedCount} SKU(s) excluído(s) com sucesso. `;
      revalidatePath('/skus');
      revalidatePath('/production-orders');
      revalidatePath('/demand-planning');
      revalidatePath('/dashboard');
    }
    if (inUseCount > 0) {
      message += `${inUseCount} SKU(s) não puderam ser excluído(s) por estarem em uso. `;
    }
    if (notFoundIds.length > 0) {
      message += `${notFoundIds.length} SKU(s) não encontrado(s).`;
    }
    if (message === '') {
        message = 'Nenhum SKU foi afetado.';
    }
    return { 
      message: message.trim(), 
      error: inUseCount > 0 || notFoundIds.length > 0 
    };
  } catch (error) {
    console.error("Error deleting multiple SKUs from Firestore:", error);
    return { message: 'Erro ao excluir SKUs em massa. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}
