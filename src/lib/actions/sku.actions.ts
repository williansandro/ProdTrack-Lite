
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SKU, SkuFormData } from '@/lib/types';
import { db, generateId } from '@/lib/data'; 

const SkuSchema = z.object({
  code: z.string().min(1, { message: 'Código é obrigatório.' }).max(50),
  description: z.string().min(1, { message: 'Descrição é obrigatória.' }).max(255),
  unitOfMeasure: z.string().min(1, { message: 'Unidade de Medida é obrigatória.' }).max(10, 'Un. Medida deve ter 10 caracteres ou menos'),
});

export async function getSkus(): Promise<SKU[]> {
  return db.skus.map(sku => ({
    ...sku,
    createdAt: new Date(sku.createdAt),
    updatedAt: new Date(sku.updatedAt),
  })).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getSkuById(id: string): Promise<SKU | undefined> {
  const sku = db.skus.find(sku => sku.id === id);
  if (sku) {
    return {
      ...sku,
      createdAt: new Date(sku.createdAt),
      updatedAt: new Date(sku.updatedAt),
    };
  }
  return undefined;
}

export async function createSku(formData: SkuFormData) {
  const validatedFields = SkuSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao criar SKU. Verifique os campos.',
    };
  }

  const { code, description, unitOfMeasure } = validatedFields.data;

  const existingSku = db.skus.find(sku => sku.code.toLowerCase() === code.toLowerCase());
  if (existingSku) {
    return {
      errors: { code: ['Este código de SKU já existe.'] },
      message: 'Falha ao criar SKU. Código já em uso.',
    };
  }

  const newSku: SKU = {
    id: generateId('sku'),
    code,
    description,
    unitOfMeasure,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.skus.unshift(newSku); 

  revalidatePath('/skus');
  revalidatePath('/production-orders'); 
  revalidatePath('/demand-planning'); 
  revalidatePath('/dashboard'); 
  return { message: 'SKU criado com sucesso.', sku: newSku };
}

export async function updateSku(id: string, formData: SkuFormData) {
  const validatedFields = SkuSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao atualizar SKU. Verifique os campos.',
    };
  }

  const { code, description, unitOfMeasure } = validatedFields.data;
  const skuIndex = db.skus.findIndex(sku => sku.id === id);

  if (skuIndex === -1) {
    return { message: 'SKU não encontrado.' , error: true};
  }

  const existingSkuWithCode = db.skus.find(sku => sku.code.toLowerCase() === code.toLowerCase() && sku.id !== id);
  if (existingSkuWithCode) {
    return {
      errors: { code: ['Este código de SKU já é usado por outro SKU.'] },
      message: 'Falha ao atualizar SKU. Conflito de código.',
    };
  }

  db.skus[skuIndex] = {
    ...db.skus[skuIndex],
    code,
    description,
    unitOfMeasure,
    updatedAt: new Date(),
  };

  revalidatePath('/skus');
  revalidatePath('/production-orders');
  revalidatePath('/demand-planning');
  revalidatePath('/dashboard');
  return { message: 'SKU atualizado com sucesso.', sku: db.skus[skuIndex] };
}

export async function deleteSku(id: string) {
  const skuIndex = db.skus.findIndex(sku => sku.id === id);

  if (skuIndex === -1) {
    return { message: 'SKU não encontrado.', error: true };
  }
  
  const isInUsePO = db.productionOrders.some(po => po.skuId === id);
  const isInUseDemand = db.demands.some(demand => demand.skuId === id);

  if (isInUsePO || isInUseDemand) {
    return { message: 'O SKU não pode ser excluído porque é usado em pedidos de produção ou planos de demanda.', error: true };
  }

  db.skus.splice(skuIndex, 1);

  revalidatePath('/skus');
  revalidatePath('/production-orders');
  revalidatePath('/demand-planning');
  revalidatePath('/dashboard');
  return { message: 'SKU excluído com sucesso.' };
}

export async function deleteMultipleSkus(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { message: 'Nenhum SKU selecionado para exclusão.', error: true };
  }

  let deletedCount = 0;
  let inUseCount = 0;
  const notFoundIds: string[] = [];

  ids.forEach(id => {
    const skuIndex = db.skus.findIndex(s => s.id === id);
    if (skuIndex !== -1) {
      const isInUsePO = db.productionOrders.some(po => po.skuId === id);
      const isInUseDemand = db.demands.some(demand => demand.skuId === id);
      if (isInUsePO || isInUseDemand) {
        inUseCount++;
      } else {
        db.skus.splice(skuIndex, 1);
        deletedCount++;
      }
    } else {
      notFoundIds.push(id);
    }
  });

  let message = '';
  if (deletedCount > 0) {
    message += `${deletedCount} SKU(s) excluído(s) com sucesso. `;
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

  if (deletedCount > 0) {
    revalidatePath('/skus');
    revalidatePath('/production-orders');
    revalidatePath('/demand-planning');
    revalidatePath('/dashboard');
  }

  return { 
    message: message.trim(), 
    error: inUseCount > 0 || notFoundIds.length > 0 
  };
}

