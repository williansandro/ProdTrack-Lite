
"use client";

import type { ProductionOrder, ProductionOrderFormData, SKU } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createProductionOrder, updateProductionOrder } from '@/lib/actions/production-order.actions';
import { useRouter } from 'next/navigation';

const ProductionOrderFormSchema = z.object({
  skuId: z.string().min(1, 'SKU é obrigatório.'),
  quantity: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Quantidade deve ser um número positivo.",
  }),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres.').optional(),
});

interface ProductionOrderFormProps {
  productionOrder?: ProductionOrder | null;
  skus: SKU[];
  onFormSubmit: () => void;
}

export function ProductionOrderForm({ productionOrder, skus, onFormSubmit }: ProductionOrderFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ProductionOrderFormData>({
    resolver: zodResolver(ProductionOrderFormSchema),
    defaultValues: {
      skuId: productionOrder?.skuId || '',
      quantity: productionOrder?.quantity?.toString() || '',
      notes: productionOrder?.notes || '',
    },
  });

  useEffect(() => {
    if (productionOrder) {
      form.reset({
        skuId: productionOrder.skuId,
        quantity: productionOrder.quantity.toString(),
        notes: productionOrder.notes || '',
      });
    } else {
      form.reset({
        skuId: '',
        quantity: '',
        notes: '',
      });
    }
  }, [productionOrder, form]);

  const isEditMode = !!productionOrder;
  const isOrderNotOpen = isEditMode && productionOrder?.status !== 'open';
  const isOrderTerminal = isEditMode && (productionOrder?.status === 'completed' || productionOrder?.status === 'cancelled');


  async function onSubmit(data: ProductionOrderFormData) {
    if (isOrderTerminal) {
        toast({
            title: 'Aviso',
            description: 'Pedidos concluídos ou cancelados não podem ser alterados.',
            variant: 'default',
        });
        onFormSubmit();
        return;
    }

    try {
      let result;
      const payload = {
        ...data,
        // quantity will be coerced by the server action schema
      };

      if (isEditMode && productionOrder?.id) {
        result = await updateProductionOrder(productionOrder.id, payload);
      } else {
        result = await createProductionOrder(payload);
      }

      if (result.error || result.errors) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            if (field === 'skuId' || field === 'quantity' || field === 'notes') {
              form.setError(field as keyof ProductionOrderFormData, {
                type: 'server',
                message: (messages as string[]).join(', '),
              });
            }
          });
        }
        toast({
          title: 'Erro',
          description: result.message || 'Falha ao salvar Pedido de Produção.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso!',
          description: result.message,
        });
        onFormSubmit();
        router.refresh();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Erro Inesperado',
        description: 'Ocorreu um erro inesperado ao processar o pedido.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="skuId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isOrderNotOpen || form.formState.isSubmitting || isOrderTerminal}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um SKU" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {skus.map((sku) => (
                    <SelectItem key={sku.id} value={sku.id}>
                      {sku.code} - {sku.description.length > 30 ? sku.description.substring(0,30) + '...' : sku.description}
                    </SelectItem>
                  ))}
                  {skus.length === 0 && <SelectItem value="" disabled>Nenhum SKU disponível</SelectItem>}
                </SelectContent>
              </Select>
              {isOrderNotOpen && !isOrderTerminal && <p className="text-sm text-muted-foreground">SKU não pode ser alterado para pedidos já iniciados.</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="ex: 100" {...field} 
                  disabled={isOrderNotOpen || form.formState.isSubmitting || isOrderTerminal}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              {isOrderNotOpen && !isOrderTerminal && <p className="text-sm text-muted-foreground">Quantidade não pode ser alterada para pedidos já iniciados.</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalhes adicionais sobre o pedido" {...field} className="min-h-[100px]" disabled={form.formState.isSubmitting || isOrderTerminal} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onFormSubmit} disabled={form.formState.isSubmitting}>
            {isOrderTerminal ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isOrderTerminal && (
            <Button type="submit" disabled={form.formState.isSubmitting || (skus.length === 0 && !isEditMode) }>
              {form.formState.isSubmitting ? (isEditMode ? 'Salvando...' : 'Criando...') : (isEditMode ? 'Salvar Alterações' : 'Criar Pedido')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
