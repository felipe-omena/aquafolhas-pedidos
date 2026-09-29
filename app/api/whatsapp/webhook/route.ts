import { hasWhatsAppMessage, listOrders, openWhatsAppWindow, saveWhatsAppResult, updateWhatsAppDelivery } from "@/db/orders";
import { getWhatsAppConfig, normalizeBrazilianPhone, sendOrderStatusMessage, verifyWhatsAppSignature } from "@/lib/whatsapp";

type WebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        messages?: { from?: string; id?: string; text?: { body?: string } }[];
        statuses?: { id?: string; status?: string; errors?: { title?: string; message?: string }[] }[];
      };
    }[];
  }[];
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = getWhatsAppConfig();
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && config.verifyToken && token === config.verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Verificação recusada.", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyWhatsAppSignature(rawBody, request.headers.get("x-hub-signature-256")))) {
    return new Response("Assinatura inválida.", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WebhookPayload;
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      for (const status of change.value?.statuses || []) {
        if (status.id && status.status) {
          const error = status.errors?.map((item) => item.message || item.title).filter(Boolean).join("; ");
          await updateWhatsAppDelivery(status.id, status.status, error);
        }
      }

      for (const message of change.value?.messages || []) {
        const text = message.text?.body || "";
        const match = text.toUpperCase().match(/AF-\d{6}-[A-Z0-9]{4}/);
        if (!match || !message.from || !message.id || await hasWhatsAppMessage(message.id)) continue;
        const order = (await listOrders(500)).find((item) => item.protocol === match[0]);
        if (!order) continue;
        try {
          if (normalizeBrazilianPhone(order.phone) !== normalizeBrazilianPhone(message.from)) continue;
        } catch {
          continue;
        }
        await openWhatsAppWindow(order.protocol, message.id);
        const result = await sendOrderStatusMessage(order, "preparing", { forceServiceWindow: true });
        await saveWhatsAppResult(order.protocol, "preparing", result, result.messageKind || "confirmation");
      }
    }
  }
  return Response.json({ received: true });
}
