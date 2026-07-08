"use client";

import { useEffect, useState } from "react";
import { Food } from "@/lib/types";
import { ShoppingListItem } from "@/lib/calc";

// Ordem e rótulos dos grupos na lista de compras (percurso do mercado).
const CATEGORIAS: { key: Food["category"]; label: string; emoji: string }[] = [
  { key: "proteina", label: "Proteínas", emoji: "🍗" },
  { key: "carbo", label: "Carboidratos", emoji: "🍚" },
  { key: "vegetal", label: "Vegetais", emoji: "🥦" },
  { key: "fruta", label: "Frutas", emoji: "🍎" },
  { key: "outro", label: "Outros", emoji: "📦" },
];

interface Props {
  titulo: string;
  itens: ShoppingListItem[];
  storageKey: string;
  // Temperos/básicos que não entram no cálculo (base pessoal + extras da semana).
  complementos?: string[];
}

// Normaliza para dedupe e comparação (sem acento, minúsculo, sem espaços nas pontas).
function normalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function ListaCompras({
  titulo,
  itens,
  storageKey,
  complementos,
}: Props) {
  const chave = "lista-compras:" + storageKey;
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);

  // Carrega as marcações salvas no navegador (por semana).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(chave);
      if (raw) {
        setMarcados(new Set(JSON.parse(raw) as string[]));
      } else {
        setMarcados(new Set());
      }
    } catch {
      setMarcados(new Set());
    }
  }, [chave]);

  function toggle(nome: string) {
    setMarcados((prev) => {
      const novo = new Set(prev);
      if (novo.has(nome)) {
        novo.delete(nome);
      } else {
        novo.add(nome);
      }
      try {
        localStorage.setItem(chave, JSON.stringify(Array.from(novo)));
      } catch {
        // ignora se o localStorage não estiver disponível
      }
      return novo;
    });
  }

  // Agrupa os itens pelas categorias (na ordem fixa), escondendo grupos vazios.
  const grupos = CATEGORIAS.map((cat) => ({
    ...cat,
    itens: itens
      .filter((it) => it.category === cat.key)
      .sort((a, b) => b.grams - a.grams),
  })).filter((g) => g.itens.length > 0);

  // Complementos: dedupe (normalizado) e esconde o que já está na lista
  // calculada (mesmo nome) para não duplicar. Preserva o texto original.
  const nomesCalculados = new Set(itens.map((it) => normalizar(it.name)));
  const compl: string[] = [];
  const vistos = new Set<string>();
  (complementos ?? []).forEach((c) => {
    const n = normalizar(c);
    if (!n || vistos.has(n) || nomesCalculados.has(n)) return;
    vistos.add(n);
    compl.push(c.trim());
  });

  // Chave de marcação dos complementos com prefixo, para não colidir com
  // nomes de alimentos.
  const chaveCompl = (c: string) => "+" + c;

  const total = itens.length + compl.length;
  const comprados =
    itens.filter((it) => marcados.has(it.name)).length +
    compl.filter((c) => marcados.has(chaveCompl(c))).length;

  // Texto para compartilhar/copiar.
  function montarTexto(): string {
    const linhas: string[] = [`🛒 Lista de Compras — ${titulo}`, ""];
    grupos.forEach((g) => {
      linhas.push(`${g.emoji} ${g.label}`);
      g.itens.forEach((it) => {
        linhas.push(`- ${it.name}: ${it.grams.toFixed(0)}g`);
      });
      linhas.push("");
    });
    if (compl.length > 0) {
      linhas.push("🧂 Complementos (temperos & básicos)");
      compl.forEach((c) => linhas.push(`- ${c}`));
      linhas.push("");
    }
    return linhas.join("\n").trim();
  }

  async function compartilhar() {
    const texto = montarTexto();
    setAviso(null);
    // No celular abre o menu nativo (WhatsApp, Notas…); senão copia.
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text: texto });
        return;
      }
    } catch {
      // usuário cancelou ou share falhou → cai no copiar abaixo
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Lista copiada!");
      setTimeout(() => setAviso(null), 2500);
    } catch {
      setAviso("Não foi possível compartilhar nesta tela.");
      setTimeout(() => setAviso(null), 2500);
    }
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
            🛒 Lista de Compras
          </h2>
          {total > 0 && (
            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              {comprados}/{total} comprados
            </p>
          )}
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={compartilhar}
            className="shrink-0 rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            📤 Compartilhar
          </button>
        )}
      </div>

      {aviso && (
        <p className="mb-2 text-sm text-emerald-700 dark:text-emerald-300">
          {aviso}
        </p>
      )}

      {total === 0 ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Nenhum alimento na lista ainda.
        </p>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g.key}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {g.emoji} {g.label}
              </p>
              <div className="space-y-1">
                {g.itens.map((it) => {
                  const feito = marcados.has(it.name);
                  return (
                    <label
                      key={it.name}
                      className="flex cursor-pointer items-center gap-3 rounded px-1 py-1 text-sm hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30"
                    >
                      <input
                        type="checkbox"
                        checked={feito}
                        onChange={() => toggle(it.name)}
                        className="size-4 shrink-0 accent-emerald-600"
                      />
                      <span
                        className={
                          "flex-1 " +
                          (feito
                            ? "text-slate-400 line-through dark:text-slate-500"
                            : "text-slate-700 dark:text-slate-300")
                        }
                      >
                        {it.name}
                      </span>
                      <span
                        className={
                          "font-semibold " +
                          (feito
                            ? "text-slate-400 line-through dark:text-slate-500"
                            : "text-emerald-700 dark:text-emerald-300")
                        }
                      >
                        {it.grams.toFixed(0)}g (CRU)
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {compl.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                🧂 Complementos (temperos & básicos)
              </p>
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                Confira o que já tem em casa — não entram no cálculo de nutrição.
              </p>
              <div className="space-y-1">
                {compl.map((c) => {
                  const feito = marcados.has(chaveCompl(c));
                  return (
                    <label
                      key={c}
                      className="flex cursor-pointer items-center gap-3 rounded px-1 py-1 text-sm hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30"
                    >
                      <input
                        type="checkbox"
                        checked={feito}
                        onChange={() => toggle(chaveCompl(c))}
                        className="size-4 shrink-0 accent-emerald-600"
                      />
                      <span
                        className={
                          "flex-1 " +
                          (feito
                            ? "text-slate-400 line-through dark:text-slate-500"
                            : "text-slate-700 dark:text-slate-300")
                        }
                      >
                        {c}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
