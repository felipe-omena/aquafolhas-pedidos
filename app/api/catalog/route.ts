import { isAdminRequest } from "@/app/admin-auth";
import { createCatalogProduct, listCatalogProducts, updateCatalogProduct, type StoredCatalogProduct } from "@/db/catalog";

const allowedTones = new Set(["tone-lime", "tone-forest", "tone-mint", "tone-red", "tone-orange", "tone-purple", "tone-yellow", "tone-sky"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalize(body: Record<string, unknown>, requireId: boolean): StoredCatalogProduct {
  const id = clean(body.id, 80);
  const name = clean(body.name, 100);
  const shortName = clean(body.shortName, 4).toUpperCase() || name.slice(0, 2).toUpperCase();
  const category = clean(body.category, 80);
  const description = clean(body.description, 180);
  const unit = clean(body.unit, 40);
  const priceCents = Math.round(Number(body.priceCents));
  const sortOrder = Math.max(0, Math.round(Number(body.sortOrder) || 0));
  const tone = allowedTones.has(String(body.tone)) ? String(body.tone) : "tone-forest";
  if ((requireId && !id) || !name || !category || !unit || !Number.isFinite(priceCents) || priceCents < 0) throw new Error("Preencha nome, categoria, unidade e um preço válido.");
  return { id, name, shortName, category, description, unit, priceCents, tone, active: body.active !== false, sortOrder };
}

export async function GET(request: Request) {
  try {
    const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
    if (includeInactive && !(await isAdminRequest())) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
    return Response.json({ products: await listCatalogProducts(includeInactive) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar o catálogo." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest())) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
    const product = normalize(await request.json() as Record<string, unknown>, false);
    const newProduct = { name: product.name, shortName: product.shortName, category: product.category, description: product.description, unit: product.unit, priceCents: product.priceCents, tone: product.tone, active: product.active, sortOrder: product.sortOrder };
    const id = await createCatalogProduct(newProduct);
    return Response.json({ id, products: await listCatalogProducts(true) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar o produto." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await isAdminRequest())) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
    const product = normalize(await request.json() as Record<string, unknown>, true);
    await updateCatalogProduct(product);
    return Response.json({ products: await listCatalogProducts(true) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o produto." }, { status: 400 });
  }
}
