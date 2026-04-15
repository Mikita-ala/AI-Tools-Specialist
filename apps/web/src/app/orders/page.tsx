import { OrdersScreen } from "@/components/orders/orders-screen";
import { getOrdersData } from "@/lib/orders-data";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getOrdersData();

  return <OrdersScreen orders={orders} />;
}
