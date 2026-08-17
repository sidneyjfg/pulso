import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Pulso ERP",
  description: "ERP SaaS simples para pequenos negocios brasileiros",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png"
  },
  openGraph: {
    title: "Pulso ERP",
    description: "Tenha o Pulso das suas vendas antes do fechamento do mes.",
    images: ["/brand/pulso-logo.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        >
          Ir para o conteúdo
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
