"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { AdminLayout } from "@/components/dashboard/admin-layout";
import {
  GeographyAnalytics,
  GeographyAnalyticsFilters,
} from "@/components/geography/geography-analytics";
import { createDateRangeFromValues } from "@/lib/date-range";
import type { OrderRecord } from "@/lib/orders-data";

export function GeographyAnalyticsScreen({
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
      section="geography"
      title="География"
      description="Аналитика по городам: где выше спрос, средний чек и какие товары заказывают чаще."
      totalOrders={orders.length}
      actions={
        <GeographyAnalyticsFilters
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
      <GeographyAnalytics orders={orders} dateRange={dateRange} source={source} />
    </AdminLayout>
  );
}
