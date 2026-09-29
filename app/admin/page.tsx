import { env } from "cloudflare:workers";
import Home from "../page";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  const adminEmail = (env as unknown as { ADMIN_EMAIL?: string }).ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail || user.email.trim().toLowerCase() !== adminEmail) {
    return (
      <main className="access-denied">
        <div>
          <img src="/logo-aquafolhas.jpeg" alt="AquaFolhas" />
          <p>Área administrativa</p>
          <h1>Acesso restrito</h1>
          <span>Esta conta não tem permissão para visualizar os pedidos.</span>
          <a href={chatGPTSignOutPath("/pedido")} target="_top">Sair e voltar ao catálogo</a>
        </div>
      </main>
    );
  }

  return <Home customerOnly={false} adminOnly />;
}
