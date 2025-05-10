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
import { Textarea } from '@/components/ui/textarea'; // Assuming you might want textarea for description
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createSku, updateSku } from '@/lib/actions/sku.actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const SkuFormSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').max(50, 'Código deve ter 50 caracteres ou menos'),
  description: z.string().min(1, 'Descrição é obrigatória').max(255, 'Descrição deve ter 255 caracteres ou menos'),
});

interface SkuFormProps {
  sku?: SKU | null; // For editing
  onFormSubmit?: () => void; // Callback to close dialog, etc.
}

export function SkuForm({ sku, onFormSubmit }: SkuFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<SkuFormData>({
    resolver: zodResolver(SkuFormSchema),
    defaultValues: {
      code: sku?.code || '',
      description: sku?.description || '',
    },
  });

  useEffect(() => {
    if (sku) {
      form.reset({
        code: sku.code,
        description: sku.description,
      });
    } else {
      form.reset({
        code: '',
        description: '',
      });
    }
  }, [sku, form]);

  async function onSubmit(data: SkuFormData) {
    try {
      let result;
      if (sku && sku.id) {
        result = await updateSku(sku.id, data);
      } else {
        result = await createSku(data);
      }

      if (result.errors) {
        // Set form errors if any field-specific errors are returned
        Object.entries(result.errors).forEach(([field, messages]) => {
          form.setError(field as keyof SkuFormData, {
            type: 'server',
            message: (messages as string[]).join(', '),
          });
        });
        toast({
          title: 'Erro',
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
        router.refresh(); // Refresh data on the page
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código do SKU</FormLabel>
              <FormControl>
                <Input placeholder="ex: ABC-123" {...field} />
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
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Descrição detalhada do SKU" {...field} className="min-h-[100px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          {onFormSubmit && ( // Show cancel button only if it's in a dialog context
             <Button type="button" variant="outline" onClick={onFormSubmit} disabled={form.formState.isSubmitting}>
                Cancelar
             </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (sku ? 'Salvando...' : 'Criando...') : (sku ? 'Salvar Alterações' : 'Criar SKU')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
