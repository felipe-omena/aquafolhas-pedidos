import { getWhatsAppConfig } from "@/lib/whatsapp";

export async function GET() {
  const config = getWhatsAppConfig();
  return Response.json({
    businessNumber: config.businessNumber,
    automaticEnabled: config.configured && config.webhookReady,
  }, { headers: { "cache-control": "no-store" } });
}
