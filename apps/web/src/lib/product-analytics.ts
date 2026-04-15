import { getOrdersData, type OrderRecord } from "@/lib/orders-data";

export type ProductMetric = {
  productName: string;
  quantitySold: number;
  revenue: number;
  ordersCount: number;
  averageCheck: number;
};

export type ProductBreakdownMetric = {
  label: string;
  value: number;
  revenue: number;
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

export const buildProductDetail = (orders: OrderRecord[], productName: string) => {
  const sourceMap = new Map<string, ProductBreakdownMetric>();
  const cityMap = new Map<string, ProductBreakdownMetric>();
  const dailyMap = new Map<string, { date: string; quantity: number; revenue: number }>();

  let quantitySold = 0;
  let revenue = 0;
  const orderIds = new Set<string>();

  for (const order of orders) {
    const matchedItems = order.items.filter((item) => item.productName === productName);
    if (matchedItems.length === 0) continue;

    orderIds.add(order.externalId);
    const sourceLabel = order.utmSource ?? "unknown";
    const cityLabel = order.city ?? "Неизвестно";

    for (const item of matchedItems) {
      quantitySold += item.quantity;
      revenue += item.lineTotal;

      const sourceEntry = sourceMap.get(sourceLabel) ?? { label: sourceLabel, value: 0, revenue: 0 };
      sourceEntry.value += item.quantity;
      sourceEntry.revenue += item.lineTotal;
      sourceMap.set(sourceLabel, sourceEntry);

      const cityEntry = cityMap.get(cityLabel) ?? { label: cityLabel, value: 0, revenue: 0 };
      cityEntry.value += item.quantity;
      cityEntry.revenue += item.lineTotal;
      cityMap.set(cityLabel, cityEntry);

      const dateKey = order.crmCreatedAt ? new Date(order.crmCreatedAt).toISOString().slice(0, 10) : "Unknown";
      const dayEntry = dailyMap.get(dateKey) ?? { date: dateKey, quantity: 0, revenue: 0 };
      dayEntry.quantity += item.quantity;
      dayEntry.revenue += item.lineTotal;
      dailyMap.set(dateKey, dayEntry);
    }
  }

  return {
    productName,
    quantitySold,
    revenue,
    ordersCount: orderIds.size,
    averageCheck: orderIds.size === 0 ? 0 : Math.round(revenue / orderIds.size),
    sources: Array.from(sourceMap.values()).sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    cities: Array.from(cityMap.values()).sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    daily: Array.from(dailyMap.values()).sort((left, right) => left.date.localeCompare(right.date)),
  };
};
