import { env } from "cloudflare:workers";

type WhatsAppOrder = {
  protocol: string;
  customerName: string;
  phone: string;
  deliveryMethod: "delivery" | "pickup";
  paymentMethod: string;
  totalCents: number;
  items: { productName: string; quantity: number }[];
};

export type WhatsAppResult = {
  status: "sent" | "failed" | "not_configured";
  messageId?: string;
  error?: string;
};

const STATUS_LABELS: Record<string, string> = {
  preparing: "em separação",
  ready: "separado",
  delivered: "entregue",
  canceled: "cancelado",
};

function normalizeBrazilianPhone(value: string) {
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
  return summary.length > 300 ? `${summary.slice(0, 297)}...` : summary;
}

export async function sendOrderStatusMessage(order: WhatsAppOrder, status: "preparing" | "ready" | "delivered" | "canceled"): Promise<WhatsAppResult> {
  const config = env as unknown as {
    WHATSAPP_ACCESS_TOKEN?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
    WHATSAPP_TEMPLATE_NAME?: string;
    WHATSAPP_TEMPLATE_LANGUAGE?: string;
    WHATSAPP_GRAPH_API_VERSION?: string;
  };
  const token = config.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = config.WHATSAPP_TEMPLATE_NAME?.trim();
  const graphVersion = config.WHATSAPP_GRAPH_API_VERSION?.trim();
  if (!token || !phoneNumberId || !templateName || !graphVersion) {
    return { status: "not_configured", error: "Integração oficial do WhatsApp ainda não configurada." };
  }
  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    return { status: "failed", error: "Versão da API do WhatsApp inválida." };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizeBrazilianPhone(order.phone),
        type: "template",
        template: {
          name: templateName,
          language: { code: config.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "pt_BR" },
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
      }),
    });
    const payload = await response.json() as { messages?: { id?: string }[]; error?: { message?: string } };
    if (!response.ok || !payload.messages?.[0]?.id) {
      return { status: "failed", error: payload.error?.message || `WhatsApp respondeu com status ${response.status}.` };
    }
    return { status: "sent", messageId: payload.messages[0].id };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Falha ao enviar mensagem pelo WhatsApp." };
  }
}
