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
  { key: "gordura", label: "Gorduras", emoji: "🧈" },
  { key: "molho", label: "Molhos & Temperos", emoji: "🥫" },
  { key: "outro", label: "Outros", emoji: "📦" },
];

interface Props {
  titulo: string;
  itens: ShoppingListItem[];
  // Chave de persistência das marcações. Ausente (semana nova, não salva) =
  // não persiste: os checkboxes começam sempre limpos e não são gravados.
  storageKey?: string;
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
  // Só persiste quando há uma semana salva (storageKey real). Semana nova não
  // grava nem lê nada — os checkboxes começam sempre limpos.
  const persist = !!storageKey;
  const chave = "lista-compras:" + storageKey;
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);

  // Carrega as marcações salvas no navegador (por semana). Sem persistência,
  // começa vazio a cada montagem.
  useEffect(() => {
    if (!persist) {
      setMarcados(new Set());
      return;
    }
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
  }, [chave, persist]);

  function toggle(nome: string) {
    setMarcados((prev) => {
      const novo = new Set(prev);
      if (novo.has(nome)) {
        novo.delete(nome);
      } else {
        novo.add(nome);
      }
      if (persist) {
        try {
          localStorage.setItem(chave, JSON.stringify(Array.from(novo)));
        } catch {
          // ignora se o localStorage não estiver disponível
        }
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
    <div className="rounded-[20px] bg-emerald-700 p-5 text-white">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white [font-family:var(--font-display)]">
            🛒 Lista de compras
          </h2>
          {total > 0 && (
            <p className="mt-0.5 text-xs text-emerald-100">
              {comprados}/{total} comprados
            </p>
          )}
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={compartilhar}
            className="shrink-0 rounded-[9px] border border-white/35 bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-white/25"
          >
            📤 Enviar
          </button>
        )}
      </div>

      {aviso && <p className="mb-2 text-sm text-emerald-100">{aviso}</p>}

      {total === 0 ? (
        <p className="text-sm text-emerald-100">
          Adicione alimentos para ver a lista.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((g) => (
            <div key={g.key}>
              <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#BFD8C4]">
                {g.emoji} {g.label}
              </p>
              <div>
                {g.itens.map((it) => {
                  const feito = marcados.has(it.name);
                  return (
                    <label
                      key={it.name}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-white/10 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={feito}
                        onChange={() => toggle(it.name)}
                        className="size-4 shrink-0 accent-emerald-400"
                      />
                      <span
                        className={
                          "flex-1 text-[14.5px] " +
                          (feito ? "text-emerald-200/60 line-through" : "")
                        }
                      >
                        {it.name}
                      </span>
                      <span
                        className={
                          "whitespace-nowrap text-sm font-bold " +
                          (feito
                            ? "text-emerald-200/50 line-through"
                            : "text-[#F4E6C8]")
                        }
                      >
                        {it.grams.toFixed(0)} g
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {compl.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#BFD8C4]">
                🧂 Complementos
              </p>
              <div>
                {compl.map((c) => {
                  const feito = marcados.has(chaveCompl(c));
                  return (
                    <label
                      key={c}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-white/10 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={feito}
                        onChange={() => toggle(chaveCompl(c))}
                        className="size-4 shrink-0 accent-emerald-400"
                      />
                      <span
                        className={
                          "flex-1 text-[14.5px] " +
                          (feito ? "text-emerald-200/60 line-through" : "")
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
