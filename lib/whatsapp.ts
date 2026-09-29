import { env } from "cloudflare:workers";
import { countOutgoingWhatsAppMessagesThisMonth } from "@/db/orders";

export type WhatsAppOrder = {
  protocol: string;
  customerName: string;
  phone: string;
  deliveryMethod: "delivery" | "pickup";
  paymentMethod: string;
  totalCents: number;
  whatsappWindowOpenedAt?: string | null;
  items: { productName: string; quantity: number }[];
};

export type WhatsAppResult = {
  status: "sent" | "failed" | "not_configured";
  messageId?: string;
  error?: string;
  messageKind?: "service" | "template" | "test";
};

type WhatsAppEnvironment = {
  WHATSAPP_ENABLED?: string;
  WHATSAPP_MODE?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_BUSINESS_NUMBER?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_APP_SECRET?: string;
  WHATSAPP_TEMPLATE_NAME?: string;
  WHATSAPP_TEMPLATE_LANGUAGE?: string;
  WHATSAPP_TEST_TEMPLATE_NAME?: string;
  WHATSAPP_TEST_TEMPLATE_LANGUAGE?: string;
  WHATSAPP_GRAPH_API_VERSION?: string;
  WHATSAPP_MONTHLY_LIMIT?: string;
};

const STATUS_LABELS: Record<string, string> = {
  preparing: "em separação",
  ready: "separado",
  delivered: "entregue",
  canceled: "cancelado",
};

function rawConfig() {
  return env as unknown as WhatsAppEnvironment;
}

export function getWhatsAppConfig() {
  const config = rawConfig();
  const monthlyLimit = Math.max(1, Number.parseInt(config.WHATSAPP_MONTHLY_LIMIT || "900", 10) || 900);
  const enabled = config.WHATSAPP_ENABLED?.trim().toLowerCase() === "true";
  const graphVersion = config.WHATSAPP_GRAPH_API_VERSION?.trim() || "";
  const token = config.WHATSAPP_ACCESS_TOKEN?.trim() || "";
  const phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
  const verifyToken = config.WHATSAPP_VERIFY_TOKEN?.trim() || "";
  const appSecret = config.WHATSAPP_APP_SECRET?.trim() || "";
  return {
    enabled,
    mode: config.WHATSAPP_MODE?.trim() === "live" ? "live" as const : "test" as const,
    graphVersion,
    token,
    phoneNumberId,
    verifyToken,
    appSecret,
    businessNumber: config.WHATSAPP_BUSINESS_NUMBER?.trim() || "5561998652819",
    templateName: config.WHATSAPP_TEMPLATE_NAME?.trim() || "",
    templateLanguage: config.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "pt_BR",
    testTemplateName: config.WHATSAPP_TEST_TEMPLATE_NAME?.trim() || "hello_world",
    testTemplateLanguage: config.WHATSAPP_TEST_TEMPLATE_LANGUAGE?.trim() || "en_US",
    monthlyLimit,
    configured: enabled && Boolean(token && phoneNumberId && /^v\d+\.\d+$/.test(graphVersion)),
    webhookReady: Boolean(verifyToken && appSecret),
  };
}

export function normalizeBrazilianPhone(value: string) {
  let digits = value.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13) throw new Error("Número de WhatsApp inválido.");
  return digits;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function orderSummary(order: WhatsAppOrder) {
  const summary = order.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ");
  return summary.length > 500 ? `${summary.slice(0, 497)}...` : summary;
}

function orderMessage(order: WhatsAppOrder, status: "preparing" | "ready" | "delivered" | "canceled") {
  const firstName = order.customerName.split(" ")[0] || order.customerName;
  const greeting = status === "preparing" ? `Olá, ${firstName}! 🌿 Recebemos seu pedido AquaFolhas.` : `Olá, ${firstName}! 🌿 Temos uma atualização do seu pedido AquaFolhas.`;
  return `${greeting}\n\nProtocolo: ${order.protocol}\nStatus: ${STATUS_LABELS[status]}\nResumo: ${orderSummary(order)}\nRecebimento: ${order.deliveryMethod === "delivery" ? "Entrega no sábado" : "Retirada no domingo"}\nPagamento: ${order.paymentMethod}\nTotal: ${formatMoney(order.totalCents)}`;
}

async function sendPayload(to: string, body: Record<string, unknown>, messageKind: WhatsAppResult["messageKind"]): Promise<WhatsAppResult> {
  const config = getWhatsAppConfig();
  if (!config.configured) return { status: "not_configured", error: "Integração oficial do WhatsApp ainda não configurada." };
  const used = await countOutgoingWhatsAppMessagesThisMonth();
  if (used >= config.monthlyLimit) return { status: "failed", error: `Limite de segurança mensal atingido (${config.monthlyLimit} mensagens).` };
  try {
    const response = await fetch(`https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: normalizeBrazilianPhone(to), ...body }),
    });
    const payload = await response.json() as { messages?: { id?: string }[]; error?: { message?: string } };
    if (!response.ok || !payload.messages?.[0]?.id) {
      return { status: "failed", error: payload.error?.message || `WhatsApp respondeu com status ${response.status}.`, messageKind };
    }
    return { status: "sent", messageId: payload.messages[0].id, messageKind };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Falha ao enviar mensagem pelo WhatsApp.", messageKind };
  }
}

function windowIsOpen(value?: string | null) {
  if (!value) return false;
  const opened = new Date(value).getTime();
  return Number.isFinite(opened) && Date.now() - opened < 24 * 60 * 60 * 1000;
}

export async function sendOrderStatusMessage(order: WhatsAppOrder, status: "preparing" | "ready" | "delivered" | "canceled", options?: { forceServiceWindow?: boolean }): Promise<WhatsAppResult> {
  const config = getWhatsAppConfig();
  if (!config.configured) return { status: "not_configured", error: "Integração oficial do WhatsApp ainda não configurada." };

  if (options?.forceServiceWindow || windowIsOpen(order.whatsappWindowOpenedAt)) {
    return sendPayload(order.phone, { type: "text", text: { preview_url: false, body: orderMessage(order, status) } }, "service");
  }

  if (!config.templateName) {
    return { status: "failed", error: "A janela de 24 horas terminou e o modelo de atualização ainda não foi aprovado pela Meta." };
  }

  return sendPayload(order.phone, {
    type: "template",
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: order.customerName.split(" ")[0] || order.customerName },
          { type: "text", text: order.protocol },
          { type: "text", text: STATUS_LABELS[status] },
          { type: "text", text: orderSummary(order) },
          { type: "text", text: order.deliveryMethod === "delivery" ? "Entrega no sábado" : "Retirada no domingo" },
          { type: "text", text: order.paymentMethod },
          { type: "text", text: formatMoney(order.totalCents) },
        ],
      }],
    },
  }, "template");
}

export async function sendTestMessage(phone: string) {
  const config = getWhatsAppConfig();
  return sendPayload(phone, {
    type: "template",
    template: { name: config.testTemplateName, language: { code: config.testTemplateLanguage } },
  }, "test");
}

export async function verifyWhatsAppSignature(rawBody: string, signature: string | null) {
  const secret = getWhatsAppConfig().appSecret;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = `sha256=${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
}
