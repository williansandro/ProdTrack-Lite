"use client";

import type { SKU } from '@/lib/types';
import type { ColumnDef } from "@tanstack/react-table";
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SkuForm } from '@/components/skus/SkuForm';
import { DataTable } from '@/components/shared/DataTable';
import { PlusCircle, Edit3, Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { deleteSku } from '@/lib/actions/sku.actions';
import { format } from 'date-fns';

interface SkuClientPageProps {
  initialSkus: SKU[];
}

export function SkuClientPage({ initialSkus }: SkuClientPageProps) {
  const [skus, setSkus] = useState<SKU[]>(initialSkus);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [deletingSku, setDeletingSku] = useState<SKU | null>(null);
  const { toast } = useToast();

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    setEditingSku(null);
    // Data will be refreshed by server action revalidation
  };

  const openEditForm = (sku: SKU) => {
    setEditingSku(sku);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (sku: SKU) => {
    setDeletingSku(sku);
  };

  const handleDelete = async () => {
    if (!deletingSku) return;
    const result = await deleteSku(deletingSku.id);
    if (result.error) {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
    } else {
        toast({ title: 'Success', description: result.message });
        setSkus(prev => prev.filter(s => s.id !== deletingSku.id)); // Optimistic update
    }
    setDeletingSku(null);
  };
  
  const columns: ColumnDef<SKU>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <div className="truncate max-w-xs">{row.original.description}</div>,
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy, HH:mm"),
    },
    {
      accessorKey: "updatedAt",
      header: "Updated At",
      cell: ({ row }) => format(new Date(row.original.updatedAt), "dd MMM yyyy, HH:mm"),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const sku = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openEditForm(sku)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDeleteConfirm(sku)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">SKU Management</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) setEditingSku(null); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New SKU
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingSku ? 'Edit SKU' : 'Create New SKU'}</DialogTitle>
              <DialogDescription>
                {editingSku ? 'Update the details of this SKU.' : 'Fill in the details for the new SKU.'}
              </DialogDescription>
            </DialogHeader>
            <SkuForm sku={editingSku} onFormSubmit={handleFormSubmit} />
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={initialSkus} // Use initialSkus from props, server actions handle revalidation
        filterColumn="code"
        filterPlaceholder="Filter by code..."
      />

      {deletingSku && (
        <AlertDialog open={!!deletingSku} onOpenChange={() => setDeletingSku(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the SKU: <strong>{deletingSku.code}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingSku(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
