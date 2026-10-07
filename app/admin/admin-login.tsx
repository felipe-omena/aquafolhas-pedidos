"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <img src="/logo-aquafolhas.jpeg" alt="AquaFolhas Produtos Sustentáveis" />
        <span className="login-icon"><LockKeyhole /></span>
        <p>ÁREA DA GERÊNCIA</p>
        <h1>Acesse o painel</h1>
        <span>Use a senha administrativa configurada na hospedagem.</span>
        <div className="login-field"><Label htmlFor="adminPassword">Senha</Label><Input id="adminPassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div>
        {error && <div className="login-error">{error}</div>}
        <Button type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar na gerência"}</Button>
        <a href="/pedido">Voltar para os pedidos</a>
      </form>
    </main>
  );
}
