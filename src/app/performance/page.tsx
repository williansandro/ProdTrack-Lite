
import { getSkus } from '@/lib/actions/sku.actions';
import { getProductionOrders } from '@/lib/actions/production-order.actions';
import type { PerformanceSkuData, SKU, ProductionOrder } from '@/lib/types';
import { PerformanceClientPage } from './PerformanceClientPage';
import { Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  const skus = await getSkus();
  const productionOrders = await getProductionOrders();

  const completedOrders = productionOrders.filter(po => po.status === 'completed' && typeof po.deliveredQuantity === 'number' && po.deliveredQuantity > 0);

  const skuProductionMap: Record<string, { sku: SKU, totalProduced: number }> = {};

  skus.forEach(sku => {
    skuProductionMap[sku.id] = { sku, totalProduced: 0 };
  });

  completedOrders.forEach(order => {
    if (skuProductionMap[order.skuId] && order.deliveredQuantity) {
      skuProductionMap[order.skuId].totalProduced += order.deliveredQuantity;
    }
  });

  let performanceData: PerformanceSkuData[] = Object.values(skuProductionMap)
    .filter(data => data.totalProduced > 0) // Only include SKUs that were produced
    .map(data => ({
      id: data.sku.id,
      skuCode: data.sku.code,
      description: data.sku.description,
      totalProduced: data.totalProduced,
      percentageOfTotal: 0, // Will calculate next
      cumulativePercentage: 0, // Will calculate next
      abcCategory: 'C', // Default, will assign next
    }))
    .sort((a, b) => b.totalProduced - a.totalProduced);

  const totalOverallProduction = performanceData.reduce((sum, sku) => sum + sku.totalProduced, 0);

  if (totalOverallProduction > 0) {
    let cumulativePercentage = 0;
    performanceData = performanceData.map(sku => {
      const percentageOfTotal = (sku.totalProduced / totalOverallProduction) * 100;
      cumulativePercentage += percentageOfTotal;
      
      let abcCategory: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        abcCategory = 'A';
      } else if (cumulativePercentage <= 95) {
        abcCategory = 'B';
      } else {
        abcCategory = 'C';
      }
      
      return {
        ...sku,
        percentageOfTotal,
        cumulativePercentage,
        abcCategory,
      };
    });
  } else {
    // If no production, performanceData will be empty or all percentages will be 0
    performanceData = performanceData.map(sku => ({
      ...sku,
      percentageOfTotal: 0,
      cumulativePercentage: 0,
      abcCategory: 'C',
    }));
  }
  

  return <PerformanceClientPage performanceData={performanceData} />;
}
