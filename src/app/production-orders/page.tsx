
import { getProductionOrders } from '@/lib/actions/production-order.actions';
import { getSkus } from '@/lib/actions/sku.actions';
import { ProductionOrderClientPage } from './ProductionOrderClientPage';

export const dynamic = 'force-dynamic'; // Ensures the page is always dynamically rendered

export default async function ProductionOrdersPage() {
  const productionOrders = await getProductionOrders();
  const skus = await getSkus();

  return (
    <ProductionOrderClientPage initialProductionOrders={productionOrders} skus={skus} />
  );
}

