import { getSkus } from '@/lib/actions/sku.actions';
import { SkuClientPage } from './SkuClientPage';

export const revalidate = 0; // Or a suitable time in seconds, 0 for dynamic on every request

export default async function SkusPage() {
  const skus = await getSkus();

  return <SkuClientPage initialSkus={skus} />;
}
