import { getOrdersData, type OrderRecord } from "@/lib/orders-data";

export type SourceMetric = {
  source: string;
  ordersCount: number;
  ordersShare: number;
  revenue: number;
  revenueShare: number;
  averageCheck: number;
  highValueOrders: number;
};

export type SourceAnalyticsData = {
  orders: OrderRecord[];
  sources: string[];
};

export const getSourceAnalyticsData = async (): Promise<SourceAnalyticsData> => {
  const orders = await getOrdersData();
  const sources = Array.from(
    new Set(orders.map((order) => order.utmSource ?? "unknown").filter((value) => Boolean(value))),
  ).sort((left, right) => left.localeCompare(right));

  return { orders, sources };
};

export const buildSourceMetrics = (orders: OrderRecord[]): SourceMetric[] => {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const sourceMap = new Map<
    string,
    {
      ordersCount: number;
      revenue: number;
      highValueOrders: number;
    }
  >();

  for (const order of orders) {
    const source = order.utmSource ?? "unknown";
    const current = sourceMap.get(source) ?? {
      ordersCount: 0,
      revenue: 0,
      highValueOrders: 0,
    };

    current.ordersCount += 1;
    current.revenue += order.totalAmount;
    if (order.totalAmount > 50_000) {
      current.highValueOrders += 1;
    }
    sourceMap.set(source, current);
  }

  return Array.from(sourceMap.entries())
    .map(([source, metric]) => ({
      source,
      ordersCount: metric.ordersCount,
      ordersShare: totalOrders === 0 ? 0 : metric.ordersCount / totalOrders,
      revenue: metric.revenue,
      revenueShare: totalRevenue === 0 ? 0 : metric.revenue / totalRevenue,
      averageCheck: metric.ordersCount === 0 ? 0 : Math.round(metric.revenue / metric.ordersCount),
      highValueOrders: metric.highValueOrders,
    }))
    .sort((left, right) => right.revenue - left.revenue);
};

export const buildSourceDetail = (orders: OrderRecord[], source: string) => {
  const filteredOrders = orders.filter((order) => (order.utmSource ?? "unknown") === source);
  const statusMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const productMap = new Map<string, number>();
  const dailyMap = new Map<string, { date: string; orders: number; revenue: number }>();

  for (const order of filteredOrders) {
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1);
    cityMap.set(order.city ?? "Неизвестно", (cityMap.get(order.city ?? "Неизвестно") ?? 0) + 1);
    for (const item of order.items) {
      productMap.set(item.productName, (productMap.get(item.productName) ?? 0) + item.quantity);
    }
    const dateKey = order.crmCreatedAt ? new Date(order.crmCreatedAt).toISOString().slice(0, 10) : "Unknown";
    const dailyEntry = dailyMap.get(dateKey) ?? { date: dateKey, orders: 0, revenue: 0 };
    dailyEntry.orders += 1;
    dailyEntry.revenue += order.totalAmount;
    dailyMap.set(dateKey, dailyEntry);
  }

  return {
    statuses: Array.from(statusMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value),
    cities: Array.from(cityMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5),
    products: Array.from(productMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8),
    daily: Array.from(dailyMap.values()).sort((left, right) => left.date.localeCompare(right.date)),
  };
};
