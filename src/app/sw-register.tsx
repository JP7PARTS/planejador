"use client";

import { useEffect } from "react";

// Registra o service worker (só em produção/https). Ao detectar um SW novo em
// espera, pede ativação imediata e recarrega uma vez → a atualização publicada
// aparece sem reinstalar o app.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.hostname === "localhost") return;

    let recarregou = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Se já há um SW novo esperando, aplica.
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");

        reg.addEventListener("updatefound", () => {
          const novo = reg.installing;
          if (!novo) return;
          novo.addEventListener("statechange", () => {
            if (
              novo.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              novo.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => {
        // Sem SW: o app segue funcionando normalmente (só sem offline).
      });

    // Quando o SW novo assume o controle, recarrega uma vez para pegar a versão nova.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recarregou) return;
      recarregou = true;
      window.location.reload();
    });
  }, []);

  return null;
}
