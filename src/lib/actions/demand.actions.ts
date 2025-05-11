
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Demand, DemandFormData, DemandWithProgress, SKU, ProductionOrder } from '@/lib/types';
import { 
  DEMANDS_COLLECTION, 
  SKUS_COLLECTION, 
  PRODUCTION_ORDERS_COLLECTION, 
  firestoreDb,
  Timestamp 
} from '@/lib/data';
import { collection, doc, addDoc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { format, parse, getMonth, getYear } from 'date-fns';

const DemandFormSchema = z.object({
  skuId: z.string().min(1, { message: 'SKU é obrigatório.' }),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Mês/Ano deve estar no formato YYYY-MM.' }),
  targetQuantity: z.coerce
    .number({ invalid_type_error: 'Quantidade alvo deve ser um número.' })
    .int({ message: 'Quantidade alvo deve ser um número inteiro.' })
    .positive({ message: 'Quantidade alvo deve ser maior que zero.' }),
});

// Helper para converter dados do Firestore para o tipo Demand
function mapDocToDemand(docSnap: any): Demand {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    skuCode: data.skuCode || 'N/A', // Initialize skuCode
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000 || Date.now()),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt?.seconds * 1000 || Date.now()),
  } as Demand;
}

export async function getDemandsWithProgress(): Promise<DemandWithProgress[]> {
  if (!firestoreDb) {
    console.error("Firestore não inicializado em getDemandsWithProgress. Verifique a configuração do Firebase.");
    return [];
  }

  const demandsCollectionRef = collection(firestoreDb, DEMANDS_COLLECTION);
  const skusCollectionRef = collection(firestoreDb, SKUS_COLLECTION);
  const allCompletedPoQuery = query(
    collection(firestoreDb, PRODUCTION_ORDERS_COLLECTION),
    where("status", "==", "completed")
  );

  // Fetch demands, SKUs, and completed POs in parallel
  const [demandsSnapshot, skusSnapshot, allCompletedPoSnapshot] = await Promise.all([
    getDocs(demandsCollectionRef),
    getDocs(skusCollectionRef),
    getDocs(allCompletedPoQuery)
  ]);

  const demands = demandsSnapshot.docs.map(mapDocToDemand);

  const skusMap = new Map<string, string>(); // Map SKU ID to SKU Code
  skusSnapshot.docs.forEach(skuDoc => {
    skusMap.set(skuDoc.id, skuDoc.data()?.code || 'N/A');
  });
  
  const allCompletedPOs = allCompletedPoSnapshot.docs.map(poDoc => {
    const data = poDoc.data();
    return {
        id: poDoc.id,
        skuId: data.skuId,
        status: data.status,
        endTime: data.endTime instanceof Timestamp ? data.endTime.toMillis() : (typeof data.endTime === 'number' ? data.endTime : null),
        deliveredQuantity: data.deliveredQuantity,
    } as Pick<ProductionOrder, 'id' | 'skuId' | 'status' | 'endTime' | 'deliveredQuantity'>;
  });

  const demandsWithProgress: DemandWithProgress[] = [];

  for (const demand of demands) {
    // Populate skuCode using the skusMap
    demand.skuCode = demand.skuId ? (skusMap.get(demand.skuId) || 'N/A (Excluído)') : 'N/A';

    const [yearStr, monthStr] = demand.monthYear.split('-');
    const demandMonth = parseInt(monthStr, 10) - 1;
    const demandYear = parseInt(yearStr, 10);

    let producedQuantity = 0;
    // Filter the pre-fetched POs in memory
    allCompletedPOs.forEach(poData => {
      if (poData.skuId === demand.skuId) {
        if (poData.endTime) { 
          const completionDate = new Date(poData.endTime);
          if (getMonth(completionDate) === demandMonth && getYear(completionDate) === demandYear && typeof poData.deliveredQuantity === 'number') {
            producedQuantity += poData.deliveredQuantity;
          }
        }
      }
    });

    const progressPercentage = demand.targetQuantity > 0
      ? Math.min(100, Math.max(0, (producedQuantity / demand.targetQuantity) * 100))
      : 0;

    demandsWithProgress.push({
      ...demand,
      producedQuantity,
      progressPercentage,
    });
  }

  return demandsWithProgress.sort((a,b) => {
    const dateA = parse(a.monthYear, 'yyyy-MM', new Date());
    const dateB = parse(b.monthYear, 'yyyy-MM', new Date());
    if (dateB.getTime() !== dateA.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }
    return a.skuCode.localeCompare(b.skuCode);
  });
}

export async function createDemand(formData: DemandFormData) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  const validatedFields = DemandFormSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao criar Demanda. Verifique os campos.',
    };
  }

  const { skuId, monthYear, targetQuantity } = validatedFields.data;

  const skuDocRef = doc(firestoreDb, SKUS_COLLECTION, skuId);
  const skuSnap = await getDoc(skuDocRef);
  if (!skuSnap.exists()) {
    return { errors: { skuId: ['SKU selecionado não é válido ou não existe.'] }, message: 'SKU inválido.' };
  }
  const skuCode = skuSnap.data()?.code || 'N/A';

  const q = query(collection(firestoreDb, DEMANDS_COLLECTION), where("skuId", "==", skuId), where("monthYear", "==", monthYear));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { errors: { monthYear: ['Já existe uma demanda para este SKU e Mês/Ano.'] }, message: 'Demanda duplicada.' };
  }
  
  const now = new Date();
  const newDemandData = {
    skuId,
    skuCode, 
    monthYear,
    targetQuantity,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };

  try {
    const docRef = await addDoc(collection(firestoreDb, DEMANDS_COLLECTION), newDemandData);
    revalidatePath('/demand-planning');
    revalidatePath('/dashboard');
    return { message: 'Demanda criada com sucesso.', demand: { id: docRef.id, ...newDemandData, createdAt: now, updatedAt: now } };
  } catch (error) {
    console.error("Error creating Demand in Firestore:", error);
    return { message: 'Erro ao criar Demanda no banco de dados. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function updateDemand(id: string, formData: DemandFormData) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  const validatedFields = DemandFormSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao atualizar Demanda. Verifique os campos.',
    };
  }

  const { skuId, monthYear, targetQuantity } = validatedFields.data;
  const demandDocRef = doc(firestoreDb, DEMANDS_COLLECTION, id);
  const demandSnap = await getDoc(demandDocRef);

  if (!demandSnap.exists()) {
    return { message: 'Demanda não encontrada.', error: true };
  }

  const skuDocRef = doc(firestoreDb, SKUS_COLLECTION, skuId);
  const skuSnap = await getDoc(skuDocRef);
  if (!skuSnap.exists()) {
    return { errors: { skuId: ['SKU selecionado não é válido ou não existe.'] }, message: 'SKU inválido.' };
  }
  const skuCode = skuSnap.data()?.code || 'N/A';
  
  const originalDemand = mapDocToDemand(demandSnap);
  if ((originalDemand.skuId !== skuId || originalDemand.monthYear !== monthYear)) {
    const q = query(collection(firestoreDb, DEMANDS_COLLECTION), where("skuId", "==", skuId), where("monthYear", "==", monthYear));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty && querySnapshot.docs.some(docSnap => docSnap.id !== id)) {
      return {
        errors: { monthYear: ['Já existe outra demanda para este SKU e Mês/Ano.'] },
        message: 'Conflito de SKU e Mês/Ano.',
      };
    }
  }

  const updatedDemandData = {
    skuId,
    skuCode,
    monthYear,
    targetQuantity,
    updatedAt: Timestamp.fromDate(new Date()),
  };

  try {
    await setDoc(demandDocRef, updatedDemandData, { merge: true }); 
    revalidatePath('/demand-planning');
    revalidatePath('/dashboard');
    return { 
        message: 'Demanda atualizada com sucesso.', 
        demand: { 
            id, 
            ...originalDemand, 
            ...updatedDemandData, 
            updatedAt: updatedDemandData.updatedAt.toDate() 
        } 
    };
  } catch (error) {
    console.error("Error updating Demand in Firestore:", error);
    return { message: 'Erro ao atualizar Demanda. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function deleteDemand(id: string) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  try {
    await deleteDoc(doc(firestoreDb, DEMANDS_COLLECTION, id));
    revalidatePath('/demand-planning');
    revalidatePath('/dashboard');
    return { message: 'Demanda excluída com sucesso.' };
  } catch (error) {
    console.error("Error deleting Demand from Firestore:", error);
    return { message: 'Erro ao excluir Demanda. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}

export async function deleteMultipleDemands(ids: string[]) {
  if (!firestoreDb) {
    return { message: 'Erro de conexão com o banco de dados. Firestore não inicializado.', error: true };
  }
  if (!ids || ids.length === 0) return { message: 'Nenhuma demanda selecionada.', error: true };

  const batch = writeBatch(firestoreDb);
  let deletedCount = 0;

  for (const id of ids) {
    const demandDocRef = doc(firestoreDb, DEMANDS_COLLECTION, id);
    batch.delete(demandDocRef);
    deletedCount++;
  }

  try {
    await batch.commit();
    if (deletedCount > 0) {
      revalidatePath('/demand-planning');
      revalidatePath('/dashboard');
    }
    return { message: `${deletedCount} demanda(s) excluída(s) com sucesso.` };
  } catch (error) {
    console.error("Error deleting multiple Demands from Firestore:", error);
    return { message: 'Erro ao excluir demandas em massa. Verifique a conexão e as permissões do Firebase.', error: true };
  }
}


    