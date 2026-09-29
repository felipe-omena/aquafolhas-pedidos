import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Horta Fresca | Pedidos",
  description: "Catálogo da horta com pedidos, protocolo e acompanhamento em tempo real.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
