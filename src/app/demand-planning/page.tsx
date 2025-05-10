
import { getSkus } from '@/lib/actions/sku.actions';
import { getDemandsWithProgress } from '@/lib/actions/demand.actions';
import { DemandClientPage } from './DemandClientPage';

export const revalidate = 0; 

export default async function DemandPlanningPage() {
  const demands = await getDemandsWithProgress();
  const skus = await getSkus(); 

  return (
     <DemandClientPage initialDemands={demands} skus={skus} />
  );
}
