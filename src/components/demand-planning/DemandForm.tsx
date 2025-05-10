
"use client";

import type { Demand, DemandFormData, SKU, DemandWithProgress } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { createDemand, updateDemand } from '@/lib/actions/demand.actions';
import { useRouter } from 'next/navigation';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';


const DemandFormSchemaClient = z.object({
  skuId: z.string().min(1, 'SKU é obrigatório.'),
  monthYear: z.string().refine(value => {
    const date = parse(value, 'yyyy-MM', new Date());
    return isValid(date);
  }, { message: 'Mês/Ano inválido. Use o seletor.'}),
  targetQuantity: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && Number.isInteger(parseFloat(val)), {
    message: "Quantidade alvo deve ser um número inteiro positivo.",
  }),
});


interface DemandFormProps {
  demand?: DemandWithProgress | Demand | null;
  skus: SKU[];
  onFormSubmit: () => void;
}

export function DemandForm({ demand, skus, onFormSubmit }: DemandFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(
    demand?.monthYear ? parse(demand.monthYear, 'yyyy-MM', new Date()) : undefined
  );

  const form = useForm<DemandFormData>({
    resolver: zodResolver(DemandFormSchemaClient),
    defaultValues: {
      skuId: demand?.skuId || '',
      monthYear: demand?.monthYear || (selectedMonth ? format(selectedMonth, 'yyyy-MM') : ''),
      targetQuantity: demand?.targetQuantity?.toString() || '',
    },
  });

  useEffect(() => {
    if (demand) {
      const initialDate = parse(demand.monthYear, 'yyyy-MM', new Date());
      setSelectedMonth(initialDate);
      form.reset({
        skuId: demand.skuId,
        monthYear: demand.monthYear,
        targetQuantity: demand.targetQuantity.toString(),
      });
    } else {
      const currentMonth = new Date();
      setSelectedMonth(currentMonth);
      form.reset({
        skuId: '',
        monthYear: format(currentMonth, 'yyyy-MM'),
        targetQuantity: '',
      });
    }
  }, [demand, form]);
  
  useEffect(() => {
    if (selectedMonth) {
      form.setValue('monthYear', format(selectedMonth, 'yyyy-MM'));
      form.clearErrors('monthYear'); // Clear error once a valid month is set
    }
  }, [selectedMonth, form]);


  const isEditMode = !!demand;

  async function onSubmit(data: DemandFormData) {
    try {
      let result;
      const payload = {
        ...data,
        // targetQuantity will be coerced by the server action schema
      };

      if (isEditMode && demand?.id) {
        result = await updateDemand(demand.id, payload);
      } else {
        result = await createDemand(payload);
      }

      if (result.error || result.errors) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
             if (field === 'skuId' || field === 'monthYear' || field === 'targetQuantity') {
                form.setError(field as keyof DemandFormData, {
                    type: 'server',
                    message: (messages as string[]).join(', '),
                });
             }
          });
        }
        toast({
          title: 'Erro de Validação',
          description: result.message || 'Falha ao salvar Demanda.',
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
        description: 'Ocorreu um erro inesperado ao processar a demanda.',
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
                disabled={form.formState.isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um SKU" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {skus.map((sku) => (
                    <SelectItem key={sku.id} value={sku.id}>
                      {sku.code} - {sku.description.length > 40 ? sku.description.substring(0,40) + '...' : sku.description}
                    </SelectItem>
                  ))}
                  {skus.length === 0 && <SelectItem value="" disabled>Nenhum SKU disponível</SelectItem>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
            control={form.control}
            name="monthYear"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Mês/Ano da Demanda</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        disabled={form.formState.isSubmitting}
                        >
                        {selectedMonth ? (
                            format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })
                        ) : (
                            <span>Selecione Mês/Ano</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        captionLayout="dropdown-buttons"
                        selected={selectedMonth}
                        onSelect={(date) => {
                            setSelectedMonth(date);
                            if (date) {
                                field.onChange(format(date, "yyyy-MM"));
                            }
                        }}
                        fromYear={new Date().getFullYear() - 5}
                        toYear={new Date().getFullYear() + 5}
                        disabled={(date) => form.formState.isSubmitting}
                        defaultMonth={selectedMonth || new Date()}
                        initialFocus
                        components={{
                            Day: ({ ...props }) => <div className="day-cell hidden">{/* Hide days */}</div>,
                            // To effectively hide days, we need to control rendering more directly or use a month-only picker library
                            // For now, this setup allows month/year navigation but still shows days.
                            // A true month picker would involve custom calendar component.
                        }}
                        // Quick hack to make days less prominent, not a real solution for month-only picker
                        modifiersClassNames={{
                            day: 'opacity-0 pointer-events-none', 
                            selected: 'opacity-100 pointer-events-auto', // still show selected day if any
                        }}
                        className="[&_td]:hidden [&_th]:hidden [&_.rdp-day_selected]:opacity-0" // try to hide days via CSS for simplicity
                                                                                               // A more robust solution would be a dedicated month picker component
                     />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
        />

        <FormField
          control={form.control}
          name="targetQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade Alvo</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="ex: 500" 
                  {...field} 
                  disabled={form.formState.isSubmitting}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onFormSubmit} disabled={form.formState.isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || (skus.length === 0 && !isEditMode) }>
            {form.formState.isSubmitting ? (isEditMode ? 'Salvando...' : 'Criando...') : (isEditMode ? 'Salvar Alterações' : 'Criar Demanda')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
