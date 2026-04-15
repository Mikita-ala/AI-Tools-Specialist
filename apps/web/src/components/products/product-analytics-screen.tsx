"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { AdminLayout } from "@/components/dashboard/admin-layout";
import {
  ProductAnalytics,
  ProductAnalyticsFilters,
} from "@/components/products/product-analytics";
import { createDateRangeFromValues } from "@/lib/date-range";
import type { OrderRecord } from "@/lib/orders-data";

export function ProductAnalyticsScreen({
  orders,
  sources,
}: {
  orders: OrderRecord[];
  sources: string[];
}) {
  const initialDateRange = createDateRangeFromValues(orders.map((order) => order.crmCreatedAt));
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [source, setSource] = useState("all");

  return (
    <AdminLayout
      section="products"
      title="Товары"
      description="Товарная аналитика по количеству, выручке и среднему чеку."
      totalOrders={orders.length}
      actions={
        <ProductAnalyticsFilters
          sources={sources}
          dateRange={dateRange}
          source={source}
          onDateRangeChange={setDateRange}
          onSourceChange={setSource}
          onReset={() => {
            setDateRange(initialDateRange);
            setSource("all");
          }}
        />
      }
    >
      <ProductAnalytics orders={orders} dateRange={dateRange} source={source} />
    </AdminLayout>
  );
}
