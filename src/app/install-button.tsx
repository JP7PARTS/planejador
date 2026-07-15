"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

function estaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function ehIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iphone|ipad|ipod/i.test(ua);
  // iPad recente se identifica como Mac com toque.
  const iPadOS =
    /Macintosh/i.test(ua) && "ontouchend" in document;
  return iOS || iPadOS;
}

// Botão de instalar o app (PWA). No Android/desktop chama o instalador nativo;
// no iOS (que não tem instalador programático) mostra as instruções.
export default function InstallButton() {
  const [podeInstalar, setPodeInstalar] = useState(false);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);
  const [mostrarAjudaIOS, setMostrarAjudaIOS] = useState(false);

  useEffect(() => {
    setInstalado(estaInstalado());
    setIos(ehIOS());
    if (window.__deferredPrompt) setPodeInstalar(true);

    const onInstallable = () => setPodeInstalar(true);
    const onInstalled = () => {
      setPodeInstalar(false);
      setInstalado(true);
    };
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  async function instalar() {
    const dp = window.__deferredPrompt;
    if (!dp) return;
    await dp.prompt();
    try {
      await dp.userChoice;
    } catch {
      // ignora
    }
    window.__deferredPrompt = null;
    setPodeInstalar(false);
  }

  // Já instalado / rodando como app → não mostra nada.
  if (instalado) return null;

  // iOS: só faz sentido se estiver no Safari (não em app já instalado).
  const mostrarBotao = podeInstalar || ios;
  if (!mostrarBotao) return null;

  const classe =
    "shrink-0 rounded-xl border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30";

  if (ios && !podeInstalar) {
    return (
      <div className="relative">
        <button
          onClick={() => setMostrarAjudaIOS((v) => !v)}
          className={classe}
        >
          📲 Instalar
        </button>
        {mostrarAjudaIOS && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMostrarAjudaIOS(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-2 w-[260px] rounded-[14px] border border-[#EADFCD] bg-white p-3.5 text-[13px] text-slate-700 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.4)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <p className="mb-1 font-semibold">Instalar no iPhone/iPad</p>
              <p>
                Toque em <strong>Compartilhar</strong> ⬆️ na barra do Safari e
                depois em <strong>“Adicionar à Tela de Início”</strong>.
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button onClick={instalar} className={classe}>
      📲 Instalar app
    </button>
  );
}
