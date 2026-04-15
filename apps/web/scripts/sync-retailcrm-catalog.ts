import { loadEnvConfig } from "@next/env";
import { createRetailCrmClient } from "@gbc/integrations";
import { readFile } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

const baseUrl = process.env.RETAILCRM_BASE_URL;
const apiKey = process.env.RETAILCRM_API_KEY;

const STOCK_LEVEL = 1000;
const STORE_CODE = "warehouse";
const DATA_DIR = path.resolve(process.cwd(), "../../data");

const main = async () => {
  if (!baseUrl || !apiKey) {
    throw new Error("RETAILCRM_BASE_URL and RETAILCRM_API_KEY are required");
  }

  const filePath = path.join(DATA_DIR, "mock_orders.json");
  const raw = await readFile(filePath, "utf8");
  const orders = JSON.parse(raw) as Array<{
    items?: Array<{ productName?: string }>;
  }>;

  const productNames = Array.from(
    new Set(
      orders.flatMap((order) =>
        (order.items ?? [])
          .map((item) => item.productName?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  );

  const client = createRetailCrmClient({ baseUrl, apiKey });
  const offers = await client.fetchOffers();

  const matchedOffers = offers.filter((offer) => productNames.includes(offer.name));
  const unmatchedProducts = productNames.filter(
    (productName) => !matchedOffers.some((offer) => offer.name === productName),
  );

  const seen = new Set<string>();
  const inventoryPayload = matchedOffers
    .filter((offer) => {
      const key = offer.xmlId ?? String(offer.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((offer) => ({
      ...(offer.xmlId ? { xmlId: offer.xmlId } : { id: offer.id }),
      stores: [
        {
          code: STORE_CODE,
          available: STOCK_LEVEL,
          quantity: STOCK_LEVEL,
        },
      ],
    }));

  const result = await client.uploadInventories(inventoryPayload);

  console.log(
    JSON.stringify(
      {
        requestedProducts: productNames.length,
        matchedOffers: matchedOffers.length,
        updatedOffers: inventoryPayload.length,
        processedOffersCount: result.processedOffersCount ?? 0,
        unmatchedProducts,
      },
      null,
      2,
    ),
  );
};

void main();
