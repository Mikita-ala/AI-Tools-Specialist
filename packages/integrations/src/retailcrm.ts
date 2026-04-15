import { calculateOrderTotal, type NormalizedOrder, type NormalizedOrderItem } from "@gbc/domain";

type RetailCrmOrderItem = {
  productName?: string;
  quantity?: number;
  initialPrice?: number;
  offer?: {
    id?: number | string;
    xmlId?: string;
    displayName?: string;
    name?: string;
  };
};

type RetailCrmOrderPayload = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  orderType?: string;
  orderMethod?: string;
  status?: string;
  items?: RetailCrmOrderItem[];
  delivery?: {
    address?: {
      city?: string;
      text?: string;
    };
  };
  customFields?: {
    utm_source?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

type RetailCrmOrdersResponse = {
  orders?: RetailCrmOrderPayload[];
};

type RetailCrmOffersResponse = {
  offers?: Array<{
    id: number;
    xmlId?: string | null;
    name?: string;
    quantity?: number;
    prices?: Array<{
      priceType: string;
      price: number;
      currency: string;
    }>;
  }>;
  pagination?: {
    totalPageCount?: number;
  };
};

export type RetailCrmClientConfig = {
  baseUrl: string;
  apiKey: string;
};

export type RetailCrmOfferRecord = {
  id: number;
  xmlId: string | null;
  name: string;
  quantity: number;
  prices: Array<{
    priceType: string;
    price: number;
    currency: string;
  }>;
};

const normalizeItem = (item: RetailCrmOrderItem): NormalizedOrderItem => {
  const quantity = Number(item.quantity ?? 0);
  const unitPrice = Number(item.initialPrice ?? 0);

  return {
    productName: item.productName ?? item.offer?.displayName ?? item.offer?.name ?? "Unknown product",
    quantity,
    unitPrice,
    lineTotal: quantity * unitPrice,
  };
};

export const normalizeRetailCrmOrder = (payload: RetailCrmOrderPayload): NormalizedOrder => {
  const items = (payload.items ?? []).map(normalizeItem);
  const totalAmount = calculateOrderTotal(items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })));
  const firstName = payload.firstName ?? "";
  const lastName = payload.lastName ?? "";

  return {
    externalId: String(payload.id ?? ""),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    city: payload.delivery?.address?.city ?? null,
    address: payload.delivery?.address?.text ?? null,
    status: payload.status ?? "new",
    orderType: payload.orderType ?? null,
    orderMethod: payload.orderMethod ?? null,
    utmSource: payload.customFields?.utm_source ?? null,
    totalAmount,
    crmCreatedAt: payload.createdAt ?? null,
    crmUpdatedAt: payload.updatedAt ?? null,
    rawPayload: payload,
    items,
  };
};

const normalizeBaseUrl = (baseUrl: string) => {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    throw new Error("RetailCRM base URL is empty");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const buildUrl = (baseUrl: string, path: string) => new URL(path, normalizeBaseUrl(baseUrl)).toString();

export const createRetailCrmClient = ({ baseUrl, apiKey }: RetailCrmClientConfig) => {
  const headers = {
    "X-API-KEY": apiKey,
  };

  return {
    async importOrders(payloads: RetailCrmOrderPayload[]) {
      const createdOrders: string[] = [];

      for (const payload of payloads) {
        const body = new URLSearchParams({
          order: JSON.stringify(payload),
        });

        const response = await fetch(buildUrl(baseUrl, "/api/v5/orders/create"), {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(`RetailCRM create order failed with ${response.status}: ${details}`);
        }

        const json = (await response.json()) as { id?: string | number };
        if (json.id) {
          createdOrders.push(String(json.id));
        }
      }

      return createdOrders;
    },

    async fetchOrders() {
      const response = await fetch(buildUrl(baseUrl, "/api/v5/orders?limit=100"), {
        headers,
      });

      if (!response.ok) {
        throw new Error(`RetailCRM fetch orders failed with ${response.status}`);
      }

      const json = (await response.json()) as RetailCrmOrdersResponse;
      return (json.orders ?? []).map(normalizeRetailCrmOrder);
    },

    async fetchOffers() {
      const offers: RetailCrmOfferRecord[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await fetch(buildUrl(baseUrl, `/api/v5/store/offers?limit=100&page=${page}`), {
          headers,
        });

        if (!response.ok) {
          throw new Error(`RetailCRM fetch offers failed with ${response.status}`);
        }

        const json = (await response.json()) as RetailCrmOffersResponse;

        offers.push(
          ...(json.offers ?? []).map((offer) => ({
            id: offer.id,
            xmlId: offer.xmlId ?? null,
            name: offer.name ?? "Unknown offer",
            quantity: Number(offer.quantity ?? 0),
            prices: (offer.prices ?? []).map((price) => ({
              priceType: price.priceType,
              price: Number(price.price),
              currency: price.currency,
            })),
          })),
        );

        totalPages = Math.max(Number(json.pagination?.totalPageCount ?? 1), 1);
        page += 1;
      }

      return offers;
    },

    async uploadInventories(
      offers: Array<{
        id?: number;
        xmlId?: string;
        stores: Array<{
          code: string;
          available?: number;
          quantity?: number;
        }>;
      }>,
    ) {
      const body = new URLSearchParams({
        offers: JSON.stringify(offers),
      });

      const response = await fetch(buildUrl(baseUrl, "/api/v5/store/inventories/upload"), {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`RetailCRM inventory upload failed with ${response.status}: ${details}`);
      }

      return (await response.json()) as {
        success: boolean;
        processedOffersCount?: number;
      };
    },
  };
};

export const verifyRetailCrmWebhook = (
  secret: string | null | undefined,
  providedSecret: string | null,
) => {
  if (!secret) return true;
  return providedSecret === secret;
};

export const extractRetailCrmOrderFromWebhook = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Webhook payload must be an object");
  }

  const candidate = payload as {
    order?: RetailCrmOrderPayload;
    orders?: RetailCrmOrderPayload[];
  };

  if (candidate.order) {
    return normalizeRetailCrmOrder(candidate.order);
  }

  if (candidate.orders?.[0]) {
    return normalizeRetailCrmOrder(candidate.orders[0]);
  }

  return normalizeRetailCrmOrder(payload as RetailCrmOrderPayload);
};
