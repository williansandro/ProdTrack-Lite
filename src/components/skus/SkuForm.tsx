
"use client";

import type { SKU, SkuFormData } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createSku, updateSku } from '@/lib/actions/sku.actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PackagePlus, Save } from 'lucide-react';

const SkuFormSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').max(50, 'Código deve ter 50 caracteres ou menos'),
  description: z.string().min(1, 'Nome/Descrição é obrigatório').max(255, 'Nome/Descrição deve ter 255 caracteres ou menos'),
  unitOfMeasure: z.string().min(1, 'Unidade de Medida é obrigatória').max(10, 'Un. Medida deve ter 10 caracteres ou menos'),
});

interface SkuFormProps {
  sku?: SKU | null; 
  onFormSubmit?: () => void; 
}

export function SkuForm({ sku, onFormSubmit }: SkuFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!sku;
  
  const form = useForm<SkuFormData>({
    resolver: zodResolver(SkuFormSchema),
    defaultValues: {
      code: '',
      description: '',
      unitOfMeasure: '',
    },
  });

  useEffect(() => {
    if (sku) {
      form.reset({
        code: sku.code,
        description: sku.description,
        unitOfMeasure: sku.unitOfMeasure,
      });
    } else {
      form.reset({ // Reset to empty for create form
        code: '',
        description: '',
        unitOfMeasure: '',
      });
    }
  }, [sku, form]);

  async function onSubmit(data: SkuFormData) {
    try {
      let result;
      if (isEditMode && sku?.id) {
        result = await updateSku(sku.id, data);
      } else {
        result = await createSku(data);
      }

      if (result.errors) {
        Object.entries(result.errors).forEach(([field, messages]) => {
          form.setError(field as keyof SkuFormData, {
            type: 'server',
            message: (messages as string[]).join(', '),
          });
        });
        toast({
          title: 'Erro de Validação',
          description: result.message || 'Falha ao salvar SKU.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso!',
          description: result.message,
        });
        if (onFormSubmit) { 
          onFormSubmit();
        }
        if (!isEditMode) { // Reset form only for create mode
          form.reset(); 
        }
        router.refresh(); 
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Erro Inesperado',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do SKU</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: PROD001" {...field} disabled={form.formState.isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome/Descrição</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Camiseta Azul M" {...field} disabled={form.formState.isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitOfMeasure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidade de Medida</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Peça, KG, Metro" {...field} disabled={form.formState.isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end pt-2 space-x-2">
          {isEditMode && onFormSubmit && ( 
             <Button type="button" variant="outline" onClick={onFormSubmit} disabled={form.formState.isSubmitting}>
                Cancelar
             </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting} className="bg-primary hover:bg-primary/90">
            {isEditMode ? <Save className="mr-2 h-5 w-5" /> : <PackagePlus className="mr-2 h-5 w-5" />}
            {form.formState.isSubmitting ? (isEditMode ? 'Salvando...' : 'Cadastrando...') : (isEditMode ? 'Salvar Alterações' : 'Cadastrar SKU')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
