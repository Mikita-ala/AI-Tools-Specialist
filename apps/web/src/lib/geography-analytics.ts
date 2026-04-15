import { getOrdersData, type OrderRecord } from "@/lib/orders-data";

export type CityTopProduct = {
  productName: string;
  quantity: number;
  revenue: number;
};

export type CityMetric = {
  city: string;
  ordersCount: number;
  revenue: number;
  averageCheck: number;
  topProducts: CityTopProduct[];
};

export type GeographyAnalyticsData = {
  orders: OrderRecord[];
  sources: string[];
};

export const getGeographyAnalyticsData = async (): Promise<GeographyAnalyticsData> => {
  const orders = await getOrdersData();

  const sources = Array.from(
    new Set(orders.map((order) => order.utmSource).filter((value): value is string => Boolean(value))),
  ).sort((left, right) => left.localeCompare(right));

  return { orders, sources };
};

export const buildCityMetrics = (orders: OrderRecord[]): CityMetric[] => {
  const cityMap = new Map<
    string,
    {
      ordersCount: number;
      revenue: number;
      products: Map<string, CityTopProduct>;
    }
  >();

  for (const order of orders) {
    const city = order.city?.trim() || "Неизвестно";
    const current = cityMap.get(city) ?? {
      ordersCount: 0,
      revenue: 0,
      products: new Map<string, CityTopProduct>(),
    };

    current.ordersCount += 1;
    current.revenue += order.totalAmount;

    for (const item of order.items) {
      const product = current.products.get(item.productName) ?? {
        productName: item.productName,
        quantity: 0,
        revenue: 0,
      };

      product.quantity += item.quantity;
      product.revenue += item.lineTotal;
      current.products.set(item.productName, product);
    }

    cityMap.set(city, current);
  }

  return Array.from(cityMap.entries())
    .map(([city, value]) => ({
      city,
      ordersCount: value.ordersCount,
      revenue: value.revenue,
      averageCheck: value.ordersCount === 0 ? 0 : Math.round(value.revenue / value.ordersCount),
      topProducts: Array.from(value.products.values())
        .sort((left, right) => {
          if (right.quantity !== left.quantity) return right.quantity - left.quantity;
          return right.revenue - left.revenue;
        })
        .slice(0, 3),
    }))
    .sort((left, right) => {
      if (right.ordersCount !== left.ordersCount) return right.ordersCount - left.ordersCount;
      return right.revenue - left.revenue;
    });
};
