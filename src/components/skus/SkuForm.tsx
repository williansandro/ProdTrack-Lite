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
  code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
  description: z.string().min(1, 'Description is required').max(255, 'Description must be 255 characters or less'),
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
          title: 'Error',
          description: result.message || 'Failed to save SKU.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success!',
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
        title: 'Error',
        description: 'An unexpected error occurred.',
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
              <FormLabel>SKU Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g., ABC-123" {...field} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Detailed description of the SKU" {...field} className="min-h-[100px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          {onFormSubmit && ( // Show cancel button only if it's in a dialog context
             <Button type="button" variant="outline" onClick={onFormSubmit} disabled={form.formState.isSubmitting}>
                Cancel
             </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (sku ? 'Saving...' : 'Creating...') : (sku ? 'Save Changes' : 'Create SKU')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
