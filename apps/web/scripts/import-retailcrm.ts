import { loadEnvConfig } from "@next/env";
import { createRetailCrmClient } from "@gbc/integrations";
import { readFile } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

const baseUrl = process.env.RETAILCRM_BASE_URL;
const apiKey = process.env.RETAILCRM_API_KEY;
const DEFAULT_ORDER_TYPE = "main";
const DEFAULT_ORDER_METHOD = "shopping-cart";
const DATA_DIR = path.resolve(process.cwd(), "../../data");

const main = async () => {
  if (!baseUrl || !apiKey) {
    throw new Error("RETAILCRM_BASE_URL and RETAILCRM_API_KEY are required");
  }

  const filePath = path.join(DATA_DIR, "mock_orders.json");
  const raw = await readFile(filePath, "utf8");
  const client = createRetailCrmClient({ baseUrl, apiKey });
  const offers = await client.fetchOffers();
  const offerByName = new Map(
    offers.map((offer) => [offer.name, offer]),
  );
  const orders = (JSON.parse(raw) as Array<Record<string, unknown>>).map((order) => {
    const items = Array.isArray(order.items) ? order.items : [];

    return {
      ...order,
      status: "new",
      orderType: DEFAULT_ORDER_TYPE,
      orderMethod: DEFAULT_ORDER_METHOD,
      items: items.map((item) => {
        if (!item || typeof item !== "object") return item;
        const productName =
          "productName" in item && typeof item.productName === "string" ? item.productName : null;
        const offer = productName ? offerByName.get(productName) : null;

        return offer
          ? {
              ...item,
              offer: {
                ...(offer.xmlId ? { xmlId: offer.xmlId } : { id: offer.id }),
              },
            }
          : item;
      }),
    };
  });
  const result = await client.importOrders(orders as never[]);

  console.log(
    `Imported with API payload: status=new orderType=${DEFAULT_ORDER_TYPE} orderMethod=${DEFAULT_ORDER_METHOD}`,
  );
  console.log(`Imported ${result.length} orders to RetailCRM.`);
};

void main();
