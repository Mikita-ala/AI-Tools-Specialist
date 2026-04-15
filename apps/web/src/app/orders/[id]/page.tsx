import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminLayout } from "@/components/dashboard/admin-layout";
import { OrderDetailContent } from "@/components/orders/order-detail-content";
import { Button } from "@/components/ui/button";
import { getOrderDetail, getOrdersData } from "@/lib/orders-data";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, orders] = await Promise.all([getOrderDetail(id), getOrdersData()]);

  if (!order) {
    notFound();
  }

  return (
    <AdminLayout
      section="orders"
      title={`Заказ #${order.externalId}`}
      description="Подробная карточка заказа: клиент, источник, адрес и состав заказа."
      totalOrders={orders.length}
      actions={
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/orders" />}>
          <ArrowLeft className="mr-2 size-4" />
          Назад к списку
        </Button>
      }
    >
      <div className="px-4 pb-6 lg:px-6">
        <OrderDetailContent order={order} />
      </div>
    </AdminLayout>
  );
}
