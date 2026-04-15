import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type MockOrder = {
  items?: Array<{
    productName?: string;
    initialPrice?: number;
  }>;
};

type ProductRow = {
  name: string;
  externalId: string;
  article: string;
  price: number;
  quantity: number;
  group: string;
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");

const escapeCsv = (value: string | number) => {
  const stringValue = String(value);
  if (/[",\n;]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
};

const main = async () => {
  const inputPath = path.resolve(process.cwd(), "../../mock_orders.json");
  const outputPath = path.resolve(process.cwd(), "../../retailcrm-products-import.csv");
  const raw = await readFile(inputPath, "utf8");
  const orders = JSON.parse(raw) as MockOrder[];

  const products = new Map<string, ProductRow>();

  for (const order of orders) {
    for (const item of order.items ?? []) {
      const name = item.productName?.trim();
      if (!name) continue;

      const existing = products.get(name);
      if (existing) continue;

      const slug = toSlug(name);
      products.set(name, {
        name,
        externalId: `mock-${slug}`,
        article: `mock-${slug}`,
        price: Number(item.initialPrice ?? 0),
        quantity: 1000,
        group: "Mock Catalog",
      });
    }
  }

  const rows = Array.from(products.values()).sort((left, right) => left.name.localeCompare(right.name, "ru"));

  const header = ["Название", "Внешний ID", "Артикул", "Базовая", "Количество", "Товарная группа"];
  const csv = [
    header.join(";"),
    ...rows.map((row) =>
      [
        escapeCsv(row.name),
        escapeCsv(row.externalId),
        escapeCsv(row.article),
        escapeCsv(row.price),
        escapeCsv(row.quantity),
        escapeCsv(row.group),
      ].join(";"),
    ),
  ].join("\n");

  await writeFile(outputPath, csv, "utf8");
  console.log(`Exported ${rows.length} products to ${outputPath}`);
};

void main();
