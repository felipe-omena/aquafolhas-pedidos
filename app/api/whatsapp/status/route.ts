import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { countOutgoingWhatsAppMessagesThisMonth } from "@/db/orders";
import { getWhatsAppConfig } from "@/lib/whatsapp";

async function isAdmin() {
  const user = await getChatGPTUser();
  const adminEmail = (env as unknown as { ADMIN_EMAIL?: string }).ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(user && adminEmail && user.email.trim().toLowerCase() === adminEmail);
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const config = getWhatsAppConfig();
  const usedThisMonth = await countOutgoingWhatsAppMessagesThisMonth();
  return Response.json({
    integration: {
      configured: config.configured,
      webhookReady: config.webhookReady,
      mode: config.mode,
      businessNumber: config.businessNumber,
      hasApprovedTemplate: Boolean(config.templateName),
      usedThisMonth,
      monthlyLimit: config.monthlyLimit,
      webhookUrl: `${new URL(request.url).origin}/api/whatsapp/webhook`,
    },
  }, { headers: { "cache-control": "no-store" } });
}
