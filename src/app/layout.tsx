import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./sw-register";

// Fonte de títulos (display) — quente e amigável.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

// Fonte de texto/UI — limpa e legível.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Planejador de Marmitas",
  description:
    "Planeje as marmitas da semana, calcule calorias e macronutrientes e descubra quanto comprar de alimento cru.",
  applicationName: "Marmita",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marmita",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2e6b47",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${bricolage.variable} ${hanken.variable}`}
    >
      <body>
        {/* Aplica o tema salvo (ou o do sistema) antes da pintura, sem flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light";}})();`,
          }}
        />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
