import { isAdminRequest } from "@/app/admin-auth";
import { countOutgoingWhatsAppMessagesThisMonth } from "@/db/orders";
import { getWhatsAppConfig } from "@/lib/whatsapp";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
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
