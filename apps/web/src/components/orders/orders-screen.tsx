"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { AdminLayout } from "@/components/dashboard/admin-layout";
import { OrdersExplorer, OrdersSearchFilters } from "@/components/orders/orders-explorer";
import { createDateRangeFromValues } from "@/lib/date-range";
import type { OrderRecord } from "@/lib/orders-data";

export function OrdersScreen({ orders }: { orders: OrderRecord[] }) {
  const initialDateRange = createDateRangeFromValues(orders.map((order) => order.crmCreatedAt));
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [query, setQuery] = useState("");

  return (
    <AdminLayout
      section="orders"
      title="Заказы"
      description="Точный фильтр по датам, поиск по клиенту и переход в детальную карточку заказа."
      totalOrders={orders.length}
      actions={
        <OrdersSearchFilters
          query={query}
          dateRange={dateRange}
          onQueryChange={setQuery}
          onDateRangeChange={setDateRange}
          onReset={() => {
            setQuery("");
            setDateRange(initialDateRange);
          }}
        />
      }
    >
      <OrdersExplorer orders={orders} query={query} dateRange={dateRange} />
    </AdminLayout>
  );
}
