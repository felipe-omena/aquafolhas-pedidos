import { adminSessionCookie, authenticateAdminPassword, clearAdminSessionCookie } from "@/app/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";
    if (!(await authenticateAdminPassword(password))) {
      return Response.json({ error: "Senha inválida." }, { status: 401 });
    }
    return Response.json({ authenticated: true }, { headers: { "set-cookie": await adminSessionCookie(), "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível entrar." }, { status: 500 });
  }
}

export async function DELETE() {
  return Response.json({ authenticated: false }, { headers: { "set-cookie": clearAdminSessionCookie(), "cache-control": "no-store" } });
}
