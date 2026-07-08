"use client";

import { Food } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

// Remove acentos e passa para minúsculas, para a busca ser tolerante
// ("feijao" acha "Feijão", "FRANGO" acha "Frango").
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

interface Props {
  alimentos: Food[];
  value: string; // foodId selecionado ("" = nenhum)
  onChange: (foodId: string) => void;
}

// Combobox de busca: um input que filtra a lista de alimentos conforme
// você digita. Substitui o <select> gigante da Tabela TACO.
export default function AlimentoSelect({ alimentos, value, onChange }: Props) {
  const selecionado = alimentos.find((f) => f.id === value);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [destaque, setDestaque] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // O que aparece no input: se está aberto, o texto digitado; senão, o nome
  // do alimento já escolhido.
  const textoInput = aberto ? busca : selecionado?.name ?? "";

  const filtrados = useMemo(() => {
    const alvo = normalizar(busca);
    if (!alvo) return alimentos;
    return alimentos.filter((f) => normalizar(f.name).includes(alvo));
  }, [alimentos, busca]);

  // Fecha ao clicar fora.
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setAberto(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function escolher(food: Food) {
    onChange(food.id);
    setAberto(false);
    setBusca("");
  }

  function aoDigitar(texto: string) {
    if (!aberto) setAberto(true);
    setBusca(texto);
    setDestaque(0);
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aberto && (e.key === "ArrowDown" || e.key === "Enter")) {
      setAberto(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestaque((d) => Math.min(d + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestaque((d) => Math.max(d - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const alvo = filtrados[destaque];
      if (alvo) escolher(alvo);
    } else if (e.key === "Escape") {
      setAberto(false);
      setBusca("");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={textoInput}
        onChange={(e) => aoDigitar(e.target.value)}
        onFocus={() => setAberto(true)}
        onKeyDown={aoTeclar}
        placeholder="Escolha um alimento…"
        className="w-full rounded-[10px] border border-[#E2D7C4] bg-white px-3 py-2.5 text-[14.5px] font-semibold text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />

      {aberto && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border border-slate-300 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {filtrados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              Nenhum alimento encontrado
            </li>
          ) : (
            filtrados.map((f, idx) => (
              <li key={f.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // onMouseDown para escolher antes do blur do input.
                    e.preventDefault();
                    escolher(f);
                  }}
                  onMouseEnter={() => setDestaque(idx)}
                  className={
                    "block w-full px-3 py-2 text-left text-sm transition " +
                    (idx === destaque
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                      : "hover:bg-slate-100 dark:hover:bg-slate-700") +
                    (f.id === value ? " font-semibold" : "")
                  }
                >
                  {f.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
