
import { getProductionOrders } from '@/lib/actions/production-order.actions';
import { getSkus } from '@/lib/actions/sku.actions';
import { ProductionOrderClientPage } from './ProductionOrderClientPage';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Keep for layout consistency if needed

export const revalidate = 0; 

export default async function ProductionOrdersPage() {
  const productionOrders = await getProductionOrders();
  const skus = await getSkus();

  return (
    <ProductionOrderClientPage initialProductionOrders={productionOrders} skus={skus} />
  );
}
