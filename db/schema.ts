import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  protocol: text("protocol").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  deliveryMethod: text("delivery_method").notNull(),
  address: text("address").notNull().default(""),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("preparing"),
  discountCents: integer("discount_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  printedAt: text("printed_at"),
  whatsappStatus: text("whatsapp_status").notNull().default("pending"),
  whatsappLastError: text("whatsapp_last_error"),
  whatsappSentAt: text("whatsapp_sent_at"),
  lastNotifiedStatus: text("last_notified_status"),
  whatsappWindowOpenedAt: text("whatsapp_window_opened_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_orders_created_at").on(table.createdAt),
  index("idx_orders_open_status").on(table.status),
]);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderProtocol: text("order_protocol").notNull().references(() => orders.protocol, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  unit: text("unit").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
}, (table) => [index("idx_order_items_protocol").on(table.orderProtocol)]);

export const whatsappMessages = sqliteTable("whatsapp_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderProtocol: text("order_protocol").references(() => orders.protocol, { onDelete: "cascade" }),
  messageId: text("message_id"),
  direction: text("direction").notNull(),
  messageKind: text("message_kind").notNull(),
  orderStatus: text("order_status"),
  deliveryStatus: text("delivery_status").notNull().default("pending"),
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_whatsapp_messages_order").on(table.orderProtocol, table.createdAt),
  index("idx_whatsapp_messages_message_id").on(table.messageId),
  index("idx_whatsapp_messages_created_at").on(table.createdAt),
]);
