
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Demand, DemandFormData, DemandWithProgress, SKU, ProductionOrder } from '@/lib/types';
import { db, generateId } from '@/lib/data';
import { format, parse, getMonth, getYear } from 'date-fns';

const DemandFormSchema = z.object({
  skuId: z.string().min(1, { message: 'SKU é obrigatório.' }),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Mês/Ano deve estar no formato YYYY-MM.' }),
  targetQuantity: z.coerce
    .number({ invalid_type_error: 'Quantidade alvo deve ser um número.' })
    .int({ message: 'Quantidade alvo deve ser um número inteiro.' })
    .positive({ message: 'Quantidade alvo deve ser maior que zero.' }),
});

export async function getDemandsWithProgress(): Promise<DemandWithProgress[]> {
  const demandsWithSkuAndDates = db.demands.map(demand => {
    const sku = db.skus.find(s => s.id === demand.skuId);
    return { 
      ...demand, 
      skuCode: sku?.code || 'N/A',
      createdAt: new Date(demand.createdAt),
      updatedAt: new Date(demand.updatedAt),
    };
  });

  const demandsWithProgress = demandsWithSkuAndDates.map(demand => {
    const [yearStr, monthStr] = demand.monthYear.split('-');
    const demandMonth = parseInt(monthStr, 10) - 1; // Month is 0-indexed in JS Date
    const demandYear = parseInt(yearStr, 10);

    const producedQuantity = db.productionOrders
      .filter(po => 
        po.skuId === demand.skuId &&
        po.status === 'completed' &&
        po.endTime && // Ensure there's an end time
        getMonth(new Date(po.endTime)) === demandMonth && // po.endTime is a timestamp
        getYear(new Date(po.endTime)) === demandYear &&
        typeof po.deliveredQuantity === 'number'
      )
      .reduce((sum, po) => sum + (po.deliveredQuantity || 0), 0);

    const progressPercentage = demand.targetQuantity > 0 
      ? Math.min(100, Math.max(0,(producedQuantity / demand.targetQuantity) * 100)) 
      : 0;
      
    return {
      ...demand,
      producedQuantity,
      progressPercentage,
    };
  });

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

  const { skuId, monthYear, targetQuantity } = validatedFields.data;

  const sku = db.skus.find(s => s.id === skuId);
  if (!sku) {
    return {
      errors: { skuId: ['SKU selecionado não é válido.'] },
      message: 'Falha ao criar Demanda. SKU inválido.',
    };
  }

  // Check for existing demand for the same SKU and monthYear
  const existingDemand = db.demands.find(d => d.skuId === skuId && d.monthYear === monthYear);
  if (existingDemand) {
    return {
      errors: { monthYear: ['Já existe uma demanda para este SKU e Mês/Ano.'] },
      message: 'Falha ao criar Demanda. Demanda duplicada.',
    };
  }

  const newDemand: Demand = {
    id: generateId('dem'),
    skuId,
    skuCode: sku.code, // Denormalize for easier display
    monthYear,
    targetQuantity,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.demands.unshift(newDemand);
  revalidatePath('/demand-planning');
  revalidatePath('/dashboard'); // Dashboard uses demand data
  return { message: 'Demanda criada com sucesso.', demand: newDemand };
}

export async function updateDemand(id: string, formData: DemandFormData) {
  const validatedFields = DemandFormSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao atualizar Demanda. Verifique os campos.',
    };
  }

  const { skuId, monthYear, targetQuantity } = validatedFields.data;
  const demandIndex = db.demands.findIndex(d => d.id === id);

  if (demandIndex === -1) {
    return { message: 'Demanda não encontrada.', error: true };
  }

  const sku = db.skus.find(s => s.id === skuId);
  if (!sku) {
    return {
      errors: { skuId: ['SKU selecionado não é válido.'] },
      message: 'Falha ao atualizar Demanda. SKU inválido.',
    };
  }

  // Check for existing demand for the same SKU and monthYear if it's being changed
  const originalDemand = db.demands[demandIndex];
  if ((originalDemand.skuId !== skuId || originalDemand.monthYear !== monthYear)) {
    const existingDemand = db.demands.find(d => d.id !== id && d.skuId === skuId && d.monthYear === monthYear);
    if (existingDemand) {
      return {
        errors: { monthYear: ['Já existe outra demanda para este SKU e Mês/Ano.'] },
        message: 'Falha ao atualizar Demanda. Conflito de SKU e Mês/Ano.',
      };
    }
  }
  

  db.demands[demandIndex] = {
    ...db.demands[demandIndex],
    skuId,
    skuCode: sku.code,
    monthYear,
    targetQuantity,
    updatedAt: new Date(),
  };

  revalidatePath('/demand-planning');
  revalidatePath('/dashboard');
  return { message: 'Demanda atualizada com sucesso.', demand: db.demands[demandIndex] };
}

export async function deleteDemand(id: string) {
  const demandIndex = db.demands.findIndex(d => d.id === id);
  if (demandIndex === -1) {
    return { message: 'Demanda não encontrada.', error: true };
  }

  db.demands.splice(demandIndex, 1);
  revalidatePath('/demand-planning');
  revalidatePath('/dashboard');
  return { message: 'Demanda excluída com sucesso.' };
}


export async function deleteMultipleDemands(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { message: 'Nenhuma demanda selecionada para exclusão.', error: true };
  }

  let deletedCount = 0;
  const notFoundIds: string[] = [];

  ids.forEach(id => {
    const demandIndex = db.demands.findIndex(d => d.id === id);
    if (demandIndex !== -1) {
      db.demands.splice(demandIndex, 1);
      deletedCount++;
    } else {
      notFoundIds.push(id);
    }
  });

  if (deletedCount > 0) {
    revalidatePath('/demand-planning');
    revalidatePath('/dashboard');
  }

  if (notFoundIds.length > 0) {
    return { 
      message: `${deletedCount} demanda(s) excluída(s). ${notFoundIds.length} demanda(s) não encontrada(s).`, 
      error: true 
    };
  }

  return { message: `${deletedCount} demanda(s) excluída(s) com sucesso.` };
}

