import { env } from "cloudflare:workers";

export type StoredOrderItem = {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
};

export type NewStoredOrder = {
  protocol: string;
  customerName: string;
  phone: string;
  deliveryMethod: string;
  address: string;
  paymentMethod: string;
  notes: string;
  discountCents: number;
  totalCents: number;
  items: StoredOrderItem[];
};

function getBinding() {
  if (!env.DB) throw new Error("Banco de pedidos indisponível no momento.");
  return env.DB;
}

export async function insertOrder(order: NewStoredOrder) {
  const db = getBinding();
  await db.batch([
    db.prepare(`INSERT INTO orders (protocol, customer_name, phone, delivery_method, address, payment_method, notes, status, discount_cents, total_cents) VALUES (?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)`)
      .bind(order.protocol, order.customerName, order.phone, order.deliveryMethod, order.address, order.paymentMethod, order.notes, order.discountCents, order.totalCents),
    ...order.items.map((item) => db.prepare(`INSERT INTO order_items (order_protocol, product_id, product_name, unit, quantity, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(order.protocol, item.productId, item.productName, item.unit, item.quantity, item.unitPriceCents, item.subtotalCents)),
  ]);
}

type JoinedRow = {
  protocol: string;
  customer_name: string;
  phone: string;
  delivery_method: "delivery" | "pickup";
  address: string;
  payment_method: string;
  notes: string;
  status: "received" | "preparing" | "ready" | "delivered";
  discount_cents: number;
  total_cents: number;
  printed_at: string | null;
  created_at: string;
  product_id: string | null;
  product_name: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price_cents: number | null;
  subtotal_cents: number | null;
};

export async function listOrders(limit = 100) {
  const db = getBinding();
  const result = await db.prepare(`SELECT o.protocol, o.customer_name, o.phone, o.delivery_method, o.address, o.payment_method, o.notes, o.status, o.discount_cents, o.total_cents, o.printed_at, o.created_at, i.product_id, i.product_name, i.unit, i.quantity, i.unit_price_cents, i.subtotal_cents FROM orders o LEFT JOIN order_items i ON i.order_protocol = o.protocol WHERE o.protocol IN (SELECT protocol FROM orders ORDER BY created_at DESC LIMIT ?) ORDER BY o.created_at DESC, i.id ASC`)
    .bind(limit).all<JoinedRow>();
  const grouped = new Map<string, {
    protocol: string; customerName: string; phone: string; deliveryMethod: "delivery" | "pickup"; address: string; paymentMethod: string; notes: string; status: "received" | "preparing" | "ready" | "delivered"; discountCents: number; totalCents: number; printedAt: string | null; createdAt: string; items: StoredOrderItem[];
  }>();
  for (const row of result.results) {
    if (!grouped.has(row.protocol)) grouped.set(row.protocol, {
      protocol: row.protocol, customerName: row.customer_name, phone: row.phone, deliveryMethod: row.delivery_method, address: row.address, paymentMethod: row.payment_method, notes: row.notes, status: row.status, discountCents: row.discount_cents, totalCents: row.total_cents, printedAt: row.printed_at, createdAt: row.created_at, items: [],
    });
    if (row.product_id && row.product_name && row.unit && row.quantity && row.unit_price_cents !== null && row.subtotal_cents !== null) {
      grouped.get(row.protocol)!.items.push({ productId: row.product_id, productName: row.product_name, unit: row.unit, quantity: row.quantity, unitPriceCents: row.unit_price_cents, subtotalCents: row.subtotal_cents });
    }
  }
  return Array.from(grouped.values());
}

export async function updateOrder(protocol: string, status?: string, printed?: boolean) {
  const db = getBinding();
  const statements = [];
  if (status) statements.push(db.prepare("UPDATE orders SET status = ? WHERE protocol = ?").bind(status, protocol));
  if (printed) statements.push(db.prepare("UPDATE orders SET printed_at = CURRENT_TIMESTAMP WHERE protocol = ?").bind(protocol));
  if (!statements.length) throw new Error("Nenhuma atualização informada.");
  await db.batch(statements);
}
