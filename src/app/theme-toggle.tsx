"use client";

import { useEffect, useState } from "react";

// Botão sol/lua: alterna entre o tema claro (creme) e o escuro (quente),
// gravando a escolha em localStorage e no atributo data-theme do <html>.
export default function ThemeToggle() {
  const [tema, setTema] = useState<"light" | "dark" | null>(null);

  // Lê o tema já aplicado pelo script anti-flash (evita mismatch de hidratação).
  useEffect(() => {
    const atual =
      (document.documentElement.dataset.theme as "light" | "dark") || "light";
    setTema(atual);
  }, []);

  function alternar() {
    const novo = tema === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    try {
      localStorage.setItem("theme", novo);
    } catch {
      // ignora se o localStorage não estiver disponível
    }
    setTema(novo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={
        tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"
      }
      title={tema === "dark" ? "Tema claro" : "Tema escuro"}
      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {/* Placeholder estável até montar, para não divergir na hidratação */}
      <span aria-hidden>{tema === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
