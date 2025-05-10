
import { getSkus } from '@/lib/actions/sku.actions';
import { SkuClientPage } from './SkuClientPage';

export const dynamic = 'force-dynamic'; // Ensures the page is always dynamically rendered

export default async function SkusPage() {
  const skus = await getSkus();

  return <SkuClientPage initialSkus={skus} />;
}

