import type { MetadataRoute } from "next";

// Web App Manifest — servido em /manifest.webmanifest e linkado automaticamente
// pelo Next. Torna o app instalável na tela inicial (Android/Chrome).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Planejador de Marmitas",
    short_name: "Marmita",
    description:
      "Planeje marmitas e refeições, calcule nutrição e saiba quanto comprar.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#faf7f0",
    theme_color: "#2e6b47",
    lang: "pt-BR",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
