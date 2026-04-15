import { SettingsScreen } from "@/components/settings/settings-screen";
import { getOrdersData } from "@/lib/orders-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const orders = await getOrdersData();
  return <SettingsScreen totalOrders={orders.length} />;
}
