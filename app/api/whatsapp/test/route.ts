import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { saveStandaloneWhatsAppResult } from "@/db/orders";
import { sendTestMessage } from "@/lib/whatsapp";

async function isAdmin() {
  const user = await getChatGPTUser();
  const adminEmail = (env as unknown as { ADMIN_EMAIL?: string }).ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(user && adminEmail && user.email.trim().toLowerCase() === adminEmail);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const body = await request.json() as { phone?: unknown };
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "";
  if (!phone) return Response.json({ error: "Informe o número que receberá o teste." }, { status: 400 });
  const result = await sendTestMessage(phone);
  await saveStandaloneWhatsAppResult(result);
  return Response.json({ result }, { status: result.status === "sent" ? 200 : 400 });
}
