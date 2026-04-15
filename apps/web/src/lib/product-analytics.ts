import { getOrdersData, type OrderRecord } from "@/lib/orders-data";

export type ProductMetric = {
  productName: string;
  quantitySold: number;
  revenue: number;
  ordersCount: number;
  averageCheck: number;
};

export type ProductAnalyticsData = {
  orders: OrderRecord[];
  sources: string[];
  catalog: string[];
};

export const getProductAnalyticsData = async (): Promise<ProductAnalyticsData> => {
  const orders = await getOrdersData();

  const sources = Array.from(
    new Set(orders.map((order) => order.utmSource).filter((value): value is string => Boolean(value))),
  ).sort((left, right) => left.localeCompare(right));

  const catalog = Array.from(
    new Set(
      orders.flatMap((order) =>
        order.items
          .map((item) => item.productName)
          .filter((value): value is string => Boolean(value && value.trim().length > 0)),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return { orders, sources, catalog };
};

export const buildProductMetrics = (orders: OrderRecord[]): ProductMetric[] => {
  const metricsMap = new Map<
    string,
    {
      quantitySold: number;
      revenue: number;
      orderIds: Set<string>;
    }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const current = metricsMap.get(item.productName) ?? {
        quantitySold: 0,
        revenue: 0,
        orderIds: new Set<string>(),
      };

      current.quantitySold += item.quantity;
      current.revenue += item.lineTotal;
      current.orderIds.add(order.externalId);
      metricsMap.set(item.productName, current);
    }
  }

  return Array.from(metricsMap.entries()).map(([productName, metric]) => ({
    productName,
    quantitySold: metric.quantitySold,
    revenue: metric.revenue,
    ordersCount: metric.orderIds.size,
    averageCheck: metric.orderIds.size === 0 ? 0 : Math.round(metric.revenue / metric.orderIds.size),
  }));
};

