'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SKU, SkuFormData } from '@/lib/types';
import { db, generateId } from '@/lib/data'; // Using the mock db

const SkuSchema = z.object({
  code: z.string().min(1, { message: 'Code is required.' }).max(50),
  description: z.string().min(1, { message: 'Description is required.' }).max(255),
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
      message: 'Failed to create SKU. Please check the fields.',
    };
  }

  const { code, description } = validatedFields.data;

  const existingSku = db.skus.find(sku => sku.code.toLowerCase() === code.toLowerCase());
  if (existingSku) {
    return {
      errors: { code: ['This SKU code already exists.'] },
      message: 'Failed to create SKU. Code already in use.',
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
  return { message: 'SKU created successfully.', sku: newSku };
}

export async function updateSku(id: string, formData: SkuFormData) {
  const validatedFields = SkuSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to update SKU. Please check the fields.',
    };
  }

  const { code, description } = validatedFields.data;
  const skuIndex = db.skus.findIndex(sku => sku.id === id);

  if (skuIndex === -1) {
    return { message: 'SKU not found.' };
  }

  // Check if new code conflicts with another existing SKU
  const existingSkuWithCode = db.skus.find(sku => sku.code.toLowerCase() === code.toLowerCase() && sku.id !== id);
  if (existingSkuWithCode) {
    return {
      errors: { code: ['This SKU code is already used by another SKU.'] },
      message: 'Failed to update SKU. Code conflict.',
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
  return { message: 'SKU updated successfully.', sku: db.skus[skuIndex] };
}

export async function deleteSku(id: string) {
  const skuIndex = db.skus.findIndex(sku => sku.id === id);

  if (skuIndex === -1) {
    return { message: 'SKU not found.' };
  }
  
  // Check if SKU is used in production orders or demands (optional: prevent deletion if in use)
  const isInUsePO = db.productionOrders.some(po => po.skuId === id);
  const isInUseDemand = db.demands.some(demand => demand.skuId === id);

  if (isInUsePO || isInUseDemand) {
    return { message: 'SKU cannot be deleted because it is used in production orders or demand plans.', error: true };
  }


  db.skus.splice(skuIndex, 1);

  revalidatePath('/skus');
  return { message: 'SKU deleted successfully.' };
}
