'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Demand, DemandFormData, DemandWithProgress, SKU, ProductionOrder } from '@/lib/types';
import { firestoreDb, DEMANDS_COLLECTION, SKUS_COLLECTION, PRODUCTION_ORDERS_COLLECTION, generateId } from '@/lib/data';
import { collection, doc, addDoc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';
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
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
  } as Demand;
}

export async function getDemandsWithProgress(): Promise<DemandWithProgress[]> {
  if (!firestoreDb) throw new Error("Firestore not initialized.");
  const demandsCollection = collection(firestoreDb, DEMANDS_COLLECTION);
  const demandsSnapshot = await getDocs(demandsCollection);
  const demands = demandsSnapshot.docs.map(mapDocToDemand);

  const demandsWithProgress: DemandWithProgress[] = [];

  for (const demand of demands) {
    if (demand.skuId) {
        const skuDoc = await getDoc(doc(firestoreDb, SKUS_COLLECTION, demand.skuId));
        if (skuDoc.exists()) {
            demand.skuCode = skuDoc.data()?.code || 'N/A';
        } else {
             demand.skuCode = 'N/A (Excluído)';
        }
    } else {
        demand.skuCode = 'N/A';
    }


    const [yearStr, monthStr] = demand.monthYear.split('-');
    const demandMonth = parseInt(monthStr, 10) - 1;
    const demandYear = parseInt(yearStr, 10);

    const poQuery = query(
      collection(firestoreDb, PRODUCTION_ORDERS_COLLECTION),
      where("skuId", "==", demand.skuId),
      where("status", "==", "completed")
    );
    const poSnapshot = await getDocs(poQuery);
    let producedQuantity = 0;
    poSnapshot.forEach(poDoc => {
      const poData = poDoc.data();
      if (poData.endTime && poData.endTime instanceof Timestamp) {
        const completionDate = poData.endTime.toDate();
        if (getMonth(completionDate) === demandMonth && getYear(completionDate) === demandYear && typeof poData.deliveredQuantity === 'number') {
          producedQuantity += poData.deliveredQuantity;
        }
      } else if (poData.endTime && typeof poData.endTime === 'number') { // Handle if endTime is stored as millis
         const completionDate = new Date(poData.endTime);
         if (getMonth(completionDate) === demandMonth && getYear(completionDate) === demandYear && typeof poData.deliveredQuantity === 'number') {
          producedQuantity += poData.deliveredQuantity;
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
  const validatedFields = DemandFormSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao criar Demanda. Verifique os campos.',
    };
  }
  if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };

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
    skuCode, // Denormalizado
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
    console.error("Error creating Demand:", error);
    return { message: 'Erro ao criar Demanda no banco de dados.', error: true };
  }
}

export async function updateDemand(id: string, formData: DemandFormData) {
  const validatedFields = DemandFormSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao atualizar Demanda. Verifique os campos.',
    };
  }
  if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };

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
    await setDoc(demandDocRef, updatedDemandData, { merge: true }); // merge: true para não sobrescrever createdAt
    revalidatePath('/demand-planning');
    revalidatePath('/dashboard');
    return { message: 'Demanda atualizada com sucesso.', demand: { id, ...updatedDemandData, createdAt: originalDemand.createdAt, updatedAt: new Date(updatedDemandData.updatedAt.toDate().getTime()) } };
  } catch (error) {
    console.error("Error updating Demand:", error);
    return { message: 'Erro ao atualizar Demanda.', error: true };
  }
}

export async function deleteDemand(id: string) {
  if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };
  try {
    await deleteDoc(doc(firestoreDb, DEMANDS_COLLECTION, id));
    revalidatePath('/demand-planning');
    revalidatePath('/dashboard');
    return { message: 'Demanda excluída com sucesso.' };
  } catch (error) {
    console.error("Error deleting Demand:", error);
    return { message: 'Erro ao excluir Demanda.', error: true };
  }
}

export async function deleteMultipleDemands(ids: string[]) {
  if (!firestoreDb) return { message: 'Erro de conexão com o banco de dados.', error: true };
  if (!ids || ids.length === 0) return { message: 'Nenhuma demanda selecionada.', error: true };

  const batch = writeBatch(firestoreDb);
  let deletedCount = 0;

  for (const id of ids) {
    const demandDocRef = doc(firestoreDb, DEMANDS_COLLECTION, id);
    // Poderia adicionar uma verificação se o doc existe, mas o batch.delete não falha se não existir.
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
    console.error("Error deleting multiple Demands:", error);
    return { message: 'Erro ao excluir demandas em massa.', error: true };
  }
}