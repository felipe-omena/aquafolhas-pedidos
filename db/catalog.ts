import { env } from "cloudflare:workers";
import { CATALOG, type CatalogProduct } from "@/lib/catalog";

export type StoredCatalogProduct = CatalogProduct & {
  active: boolean;
  sortOrder: number;
};

type CatalogRow = {
  id: string;
  name: string;
  short_name: string;
  category: string;
  description: string;
  unit: string;
  price_cents: number;
  tone: string;
  active: number;
  sort_order: number;
};

function getBinding() {
  if (!env.DB) throw new Error("Catálogo indisponível no momento.");
  return env.DB;
}

function fromRow(row: CatalogRow): StoredCatalogProduct {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    category: row.category,
    description: row.description,
    unit: row.unit,
    priceCents: row.price_cents,
    tone: row.tone,
    active: row.active === 1,
    sortOrder: row.sort_order,
  };
}

async function ensureCatalogSeeded() {
  const db = getBinding();
  const result = await db.prepare("SELECT COUNT(*) AS total FROM catalog_products").first<{ total: number }>();
  if (Number(result?.total || 0) > 0) return;
  await db.batch(CATALOG.map((product, index) => db.prepare("INSERT OR IGNORE INTO catalog_products (id, name, short_name, category, description, unit, price_cents, tone, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)")
    .bind(product.id, product.name, product.shortName, product.category, product.description, product.unit, product.priceCents, product.tone, index)));
}

export async function listCatalogProducts(includeInactive = false) {
  await ensureCatalogSeeded();
  const db = getBinding();
  const query = includeInactive
    ? "SELECT id, name, short_name, category, description, unit, price_cents, tone, active, sort_order FROM catalog_products ORDER BY active DESC, sort_order ASC, name ASC"
    : "SELECT id, name, short_name, category, description, unit, price_cents, tone, active, sort_order FROM catalog_products WHERE active = 1 ORDER BY sort_order ASC, name ASC";
  const result = await db.prepare(query).all<CatalogRow>();
  return result.results.map(fromRow);
}

export async function createCatalogProduct(product: Omit<StoredCatalogProduct, "id">) {
  await ensureCatalogSeeded();
  const db = getBinding();
  const id = `prd-${crypto.randomUUID()}`;
  await db.prepare("INSERT INTO catalog_products (id, name, short_name, category, description, unit, price_cents, tone, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, product.name, product.shortName, product.category, product.description, product.unit, product.priceCents, product.tone, product.active ? 1 : 0, product.sortOrder).run();
  return id;
}

export async function updateCatalogProduct(product: StoredCatalogProduct) {
  const db = getBinding();
  await db.prepare("UPDATE catalog_products SET name = ?, short_name = ?, category = ?, description = ?, unit = ?, price_cents = ?, tone = ?, active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(product.name, product.shortName, product.category, product.description, product.unit, product.priceCents, product.tone, product.active ? 1 : 0, product.sortOrder, product.id).run();
}
