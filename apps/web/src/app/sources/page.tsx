import { SourceAnalyticsScreen } from "@/components/sources/source-analytics-screen";
import { getSourceAnalyticsData } from "@/lib/source-analytics";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const data = await getSourceAnalyticsData();
  return <SourceAnalyticsScreen orders={data.orders} />;
}
