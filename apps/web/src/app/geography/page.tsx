import { GeographyAnalyticsScreen } from "@/components/geography/geography-analytics-screen";
import { getGeographyAnalyticsData } from "@/lib/geography-analytics";

export const dynamic = "force-dynamic";

export default async function GeographyPage() {
  const data = await getGeographyAnalyticsData();

  return <GeographyAnalyticsScreen orders={data.orders} sources={data.sources} />;
}
