import { deleteOrder, insertOrder, listOrders, saveWhatsAppResult, updateOrder } from "@/db/orders";
import { listCatalogProducts } from "@/db/catalog";
import { isAdminRequest } from "@/app/admin-auth";
import { sendOrderStatusMessage } from "@/lib/whatsapp";

const allowedStatuses = new Set(["preparing", "ready", "delivered", "canceled"]);

function clean(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function makeProtocol() {
  const date = new Date();
  const day = `${date.getFullYear().toString().slice(-2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `AF-${day}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  if (message.includes("no such table")) return "O banco de pedidos está sendo preparado. Tente novamente em instantes.";
  return message;
}

export async function GET() {
  try {
    if (!(await isAdminRequest())) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
    return Response.json({ orders: await listOrders() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      customerName?: unknown; phone?: unknown; deliveryMethod?: unknown; address?: unknown; paymentMethod?: unknown; notes?: unknown; items?: { productId?: unknown; quantity?: unknown }[];
    };
    const customerName = clean(body.customerName, 100);
    const phone = clean(body.phone, 30);
    const deliveryMethod = body.deliveryMethod === "pickup" ? "pickup" : "delivery";
    const address = clean(body.address, 240);
    const paymentMethod = clean(body.paymentMethod, 60);
    const notes = clean(body.notes, 500);
    if (!customerName || !phone || !paymentMethod) return Response.json({ error: "Preencha nome, WhatsApp e pagamento." }, { status: 400 });
    if (deliveryMethod === "delivery" && !address) return Response.json({ error: "Informe o endereço para entrega." }, { status: 400 });
    if (!Array.isArray(body.items) || !body.items.length) return Response.json({ error: "Escolha pelo menos um produto." }, { status: 400 });
    const catalog = await listCatalogProducts(false);
    const items = body.items.map((requested) => {
      const product = catalog.find((item) => item.id === requested.productId);
      const quantity = Number(requested.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("Um item do pedido é inválido.");
      return { productId: product.id, productName: product.name, unit: product.unit, quantity, unitPriceCents: product.priceCents, subtotalCents: product.priceCents * quantity };
    });
    const subtotalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    if (deliveryMethod === "delivery" && subtotalCents < 3000) return Response.json({ error: "O pedido mínimo para entrega é R$ 30,00." }, { status: 400 });
    const discountCents = deliveryMethod === "pickup" ? Math.round(subtotalCents * 0.15) : 0;
    const order = { protocol: makeProtocol(), customerName, phone, deliveryMethod, address, paymentMethod, notes, discountCents, totalCents: subtotalCents - discountCents, items };
    await insertOrder(order);
    const saved = (await listOrders(20)).find((item) => item.protocol === order.protocol);
    if (!saved) throw new Error("Pedido criado, mas não foi possível carregar a confirmação.");
    return Response.json({ order: saved }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await isAdminRequest())) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
    const body = await request.json() as { protocol?: unknown; status?: unknown; printed?: unknown };
    const orderProtocol = clean(body.protocol, 40);
    const status = typeof body.status === "string" && allowedStatuses.has(body.status) ? body.status : undefined;
    const printed = body.printed === true;
    if (!orderProtocol || (!status && !printed)) return Response.json({ error: "Atualização inválida." }, { status: 400 });
    await updateOrder(orderProtocol, status, printed);
    const order = (await listOrders()).find((item) => item.protocol === orderProtocol);
    let whatsapp = undefined;
    if (status && order) {
      whatsapp = await sendOrderStatusMessage(order, status as "preparing" | "ready" | "delivered" | "canceled");
      await saveWhatsAppResult(order.protocol, status, whatsapp, whatsapp.messageKind || "status");
    }
    return Response.json({ order, whatsapp });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdminRequest())) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
    const body = await request.json() as { protocol?: unknown };
    const orderProtocol = clean(body.protocol, 40);
    if (!orderProtocol) return Response.json({ error: "Informe o pedido que será excluído." }, { status: 400 });
    const order = (await listOrders()).find((item) => item.protocol === orderProtocol);
    if (!order) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
    await deleteOrder(orderProtocol);
    return Response.json({ deleted: true, protocol: orderProtocol });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
