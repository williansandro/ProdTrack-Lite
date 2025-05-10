'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SKU, SkuFormData } from '@/lib/types';
import { db, generateId } from '@/lib/data'; // Using the mock db

const SkuSchema = z.object({
  code: z.string().min(1, { message: 'Código é obrigatório.' }).max(50),
  description: z.string().min(1, { message: 'Descrição é obrigatória.' }).max(255),
});

export async function getSkus(): Promise<SKU[]> {
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
  return [...db.skus].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getSkuById(id: string): Promise<SKU | undefined> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return db.skus.find(sku => sku.id === id);
}

export async function createSku(formData: SkuFormData) {
  const validatedFields = SkuSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Falha ao criar SKU. Verifique os campos.',
    };
  }

  const { code, description } = validatedFields.data;

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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.skus.unshift(newSku); // Add to the beginning of the array

  revalidatePath('/skus');
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

  const { code, description } = validatedFields.data;
  const skuIndex = db.skus.findIndex(sku => sku.id === id);

  if (skuIndex === -1) {
    return { message: 'SKU não encontrado.' , error: true};
  }

  // Check if new code conflicts with another existing SKU
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
    updatedAt: new Date(),
  };

  revalidatePath('/skus');
  revalidatePath(`/skus/${id}/edit`); // If there's an edit page
  return { message: 'SKU atualizado com sucesso.', sku: db.skus[skuIndex] };
}

export async function deleteSku(id: string) {
  const skuIndex = db.skus.findIndex(sku => sku.id === id);

  if (skuIndex === -1) {
    return { message: 'SKU não encontrado.', error: true };
  }
  
  // Check if SKU is used in production orders or demands (optional: prevent deletion if in use)
  const isInUsePO = db.productionOrders.some(po => po.skuId === id);
  const isInUseDemand = db.demands.some(demand => demand.skuId === id);

  if (isInUsePO || isInUseDemand) {
    return { message: 'O SKU não pode ser excluído porque é usado em pedidos de produção ou planos de demanda.', error: true };
  }


  db.skus.splice(skuIndex, 1);

  revalidatePath('/skus');
  return { message: 'SKU excluído com sucesso.' };
}
