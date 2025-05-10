import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
// Placeholder for ProductionOrderClientPage
// import { ProductionOrderClientPage } from './ProductionOrderClientPage';
// import { getProductionOrders } from '@/lib/actions/production-order.actions';
// import { getSkus } from '@/lib/actions/sku.actions';

export default async function ProductionOrdersPage() {
  // const productionOrders = await getProductionOrders();
  // const skus = await getSkus(); // For SKU selection in forms

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Pedidos de Produção</h1>
        <Button disabled> {/* Replace with DialogTrigger when form is ready */}
          <PlusCircle className="mr-2 h-5 w-5" /> Criar Nova OP
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Lista de pedidos de produção e funcionalidades de gerenciamento serão implementadas aqui.</p>
          {/* <ProductionOrderClientPage initialProductionOrders={productionOrders} skus={skus} /> */}
        </CardContent>
      </Card>
    </div>
  );
}
