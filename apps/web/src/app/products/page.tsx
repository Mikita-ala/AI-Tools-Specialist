import { ProductAnalyticsScreen } from "@/components/products/product-analytics-screen";
import { getProductAnalyticsData } from "@/lib/product-analytics";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const data = await getProductAnalyticsData();

  return <ProductAnalyticsScreen orders={data.orders} sources={data.sources} />;
}
