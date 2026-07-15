"use client";

import { Food, RecipeWithIngredients } from "@/lib/types";
import { calculateWeekItem } from "@/lib/calc";
import { agruparIngredientes } from "@/lib/api/recipes";
import AlimentoSelect from "./alimento-select";
import { useState } from "react";

// Uma linha do prato (índice dentro do array `rows` do pai + os dados dela).
export interface ItemGrupo {
  idx: number;
  foodId: string;
  p1On: boolean;
  p1Grams: number;
  p1Marmitas: number;
  p2On: boolean;
  p2Grams: number;
  p2Marmitas: number;
}

interface Props {
  recipeId: string;
  receita?: RecipeWithIngredients;
  alimentos: Food[];
  itens: ItemGrupo[];
  isShared: boolean;
  meuNome: string;
  person2Name: string;
  inp: string;
  onAtualizarLinha: (idx: number, updates: Partial<Omit<ItemGrupo, "idx">>) => void;
  onAtualizarGrupo: (updates: Partial<Omit<ItemGrupo, "idx">>) => void;
  onEscalarPrincipal: (
    principalFoodId: string,
    novoGramas: number,
    pessoa: 1 | 2
  ) => void;
  onRemoverLinha: (idx: number) => void;
  onRemover: () => void;
}

function fmtG(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(0);
}

// Cartão de um prato (receita) na semana: agrupa os ingredientes, escala tudo
// junto por marmitas (ou pela quantidade do ingrediente principal) e esconde os
// ajustes finos atrás de "Ajustar ingredientes".
export default function ReceitaNaSemana({
  recipeId,
  receita,
  alimentos,
  itens,
  isShared,
  meuNome,
  person2Name,
  inp,
  onAtualizarLinha,
  onAtualizarGrupo,
  onEscalarPrincipal,
  onRemoverLinha,
  onRemover,
}: Props) {
  const [ajustando, setAjustando] = useState(false);

  const foodOf = (id: string) => alimentos.find((f) => f.id === id);

  // Marmitas do prato = as da 1ª linha (todas as linhas do grupo compartilham).
  const marm1 = itens[0]?.p1Marmitas ?? 1;
  const marm2 = itens[0]?.p2Marmitas ?? 1;

  // Ingrediente principal: definido na receita (is_principal). A escolha
  // principal casa pela opção que está no prato. Fallback (receita sem
  // principal / receita antiga): o de maior g/marmita.
  const principal: ItemGrupo | null = (() => {
    if (receita) {
      const { fixos, escolhas } = agruparIngredientes(receita.ingredients);
      const fixoP = fixos.find((f) => f.is_principal);
      if (fixoP) {
        const m = itens.find((it) => it.foodId === fixoP.food_id);
        if (m) return m;
      }
      const escP = escolhas.find((e) => e.is_principal);
      if (escP) {
        const m = itens.find((it) => escP.food_ids.includes(it.foodId));
        if (m) return m;
      }
    }
    return itens.reduce<ItemGrupo | null>(
      (maior, it) => (!maior || it.p1Grams > maior.p1Grams ? it : maior),
      null
    );
  })();

  function setMarmitasGrupo(pessoa: 1 | 2, valor: number) {
    const v = Math.max(1, Math.floor(valor) || 1);
    onAtualizarGrupo(pessoa === 1 ? { p1Marmitas: v } : { p2Marmitas: v });
  }

  // Totais do prato (cru/kcal/prot) por pessoa.
  function totais(pessoa: 1 | 2) {
    let cru = 0;
    let kcal = 0;
    let prot = 0;
    itens.forEach((it) => {
      const food = foodOf(it.foodId);
      const on = pessoa === 1 ? it.p1On : it.p2On;
      const grams = pessoa === 1 ? it.p1Grams : it.p2Grams;
      const marm = pessoa === 1 ? it.p1Marmitas : it.p2Marmitas;
      if (!food || !on || grams <= 0) return;
      const r = calculateWeekItem(food, grams, marm);
      cru += r.rawTotal;
      kcal += r.kcalTotal;
      prot += r.proteinTotal;
    });
    return { cru, kcal, prot };
  }

  const titulo = receita?.title || "Receita";

  // Editor do g/marmita do principal (de uma pessoa). `label` null = sem rótulo.
  const editorPrincipal = (
    label: string | null,
    grams: number,
    pessoa: 1 | 2
  ) => (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      <input
        type="number"
        min="0"
        step="1"
        defaultValue={fmtG(grams)}
        key={pessoa + "-" + fmtG(grams) + "-" + (principal?.foodId ?? "")}
        onBlur={(e) =>
          principal &&
          onEscalarPrincipal(principal.foodId, Number(e.target.value), pessoa)
        }
        className={`${inp} w-[72px] text-center`}
      />
    </div>
  );

  // Seletor de marmitas [− n +].
  const marmitasCtrl = (label: string, valor: number, pessoa: 1 | 2) => (
    <div className="flex items-center gap-2">
      <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMarmitasGrupo(pessoa, valor - 1)}
          className="grid size-7 place-items-center rounded-[8px] border border-[#E2D7C4] bg-white text-slate-600 transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-900"
          aria-label="Menos marmitas"
        >
          −
        </button>
        <input
          type="number"
          min="1"
          value={valor}
          onChange={(e) => setMarmitasGrupo(pessoa, Number(e.target.value))}
          className={`${inp} w-[52px] text-center`}
        />
        <button
          type="button"
          onClick={() => setMarmitasGrupo(pessoa, valor + 1)}
          className="grid size-7 place-items-center rounded-[8px] border border-[#E2D7C4] bg-white text-slate-600 transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-900"
          aria-label="Mais marmitas"
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="rounded-[14px] border border-[#EADFCD] bg-[#FCFAF5] p-3.5 dark:border-slate-700 dark:bg-slate-800"
      style={{ borderLeft: "4px solid #2E6B47" }}
    >
      {/* Cabeçalho */}
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15.5px] font-bold [font-family:var(--font-display)]">
            🍲 {titulo}
          </p>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            {itens.length} ingrediente{itens.length === 1 ? "" : "s"} · escala junto
          </p>
        </div>
        <button
          onClick={onRemover}
          title="Remover prato"
          aria-label="Remover prato"
          className="shrink-0 rounded-[8px] border border-[#F0DAD2] bg-[#FCF4F1] px-2 py-1 text-[13px] text-rose-600 transition hover:brightness-95 dark:border-rose-900 dark:bg-rose-950/20"
        >
          ✕
        </button>
      </div>

      {/* Controle de marmitas */}
      <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {isShared ? (
          <>
            {marmitasCtrl(meuNome, marm1, 1)}
            {marmitasCtrl(person2Name || "Outra pessoa", marm2, 2)}
          </>
        ) : (
          marmitasCtrl("Marmitas", marm1, 1)
        )}
      </div>

      {/* Editar o principal por g/marmita → os secundários escalam junto.
          Em conjunta, um editor por pessoa (cada um come sua quantidade). */}
      {principal && foodOf(principal.foodId) && (
        <div className="mb-2.5 rounded-[10px] bg-[#EEF4EC] px-3 py-2 dark:bg-emerald-950/30">
          <p className="mb-1.5 text-[12px] font-semibold text-emerald-800 dark:text-emerald-300">
            {foodOf(principal.foodId)?.name} (principal) — g/marmita:
          </p>
          {isShared ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {editorPrincipal(meuNome, principal.p1Grams, 1)}
              {editorPrincipal(person2Name || "Outra pessoa", principal.p2Grams, 2)}
            </div>
          ) : (
            editorPrincipal(null, principal.p1Grams, 1)
          )}
        </div>
      )}

      {/* Lista de ingredientes (leitura) */}
      <div className="flex flex-col divide-y divide-dashed divide-[#E7DECD] dark:divide-slate-700">
        {itens.map((it) => {
          const food = foodOf(it.foodId);
          const r1 =
            food && it.p1On && it.p1Grams > 0
              ? calculateWeekItem(food, it.p1Grams, it.p1Marmitas)
              : null;
          const r2 =
            food && isShared && it.p2On && it.p2Grams > 0
              ? calculateWeekItem(food, it.p2Grams, it.p2Marmitas)
              : null;
          const ehPrincipal = principal?.foodId === it.foodId;

          if (ajustando) {
            return (
              <div key={it.idx} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <AlimentoSelect
                    alimentos={alimentos}
                    value={it.foodId}
                    onChange={(foodId) => onAtualizarLinha(it.idx, { foodId })}
                  />
                </div>
                <div className="text-center">
                  <label className="mb-0.5 block text-[10px] font-semibold text-slate-400">
                    pronto/marmita
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={it.p1Grams}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onAtualizarLinha(it.idx, { p1Grams: v, p2Grams: v });
                    }}
                    className={`${inp} w-[64px] text-center`}
                  />
                </div>
                {ehPrincipal && (
                  <span
                    title="Principal (definido na receita)"
                    className="text-[13px] text-amber-500"
                  >
                    ⭐
                  </span>
                )}
                <button
                  onClick={() => onRemoverLinha(it.idx)}
                  title="Remover ingrediente"
                  className="p-1 text-[15px] text-rose-600 transition hover:opacity-70"
                >
                  ✕
                </button>
              </div>
            );
          }

          return (
            <div
              key={it.idx}
              className="flex items-center justify-between gap-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                {ehPrincipal && (
                  <span className="mr-1 text-[10px] text-amber-500" title="Principal">
                    ⭐
                  </span>
                )}
                {food?.name ?? "—"}
                <span className="ml-1.5 text-[12px] text-slate-400">
                  {fmtG(it.p1Grams)} g/marmita
                </span>
              </span>
              <span className="shrink-0 text-right text-[12.5px]">
                {isShared ? (
                  <span className="text-slate-600 dark:text-slate-400">
                    {r1 ? `${fmtG(r1.rawTotal)} g` : "—"}
                    {" · "}
                    {r2 ? `${fmtG(r2.rawTotal)} g` : "—"}
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {r1 ? `${fmtG(r1.rawTotal)} g crus` : "—"}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totais do prato + Ajustar */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7DECD] pt-2.5 dark:border-slate-700">
        <div className="text-[12.5px] text-slate-600 dark:text-slate-400">
          {isShared ? (
            <>
              <strong className="text-emerald-700 dark:text-emerald-400">
                {meuNome}:
              </strong>{" "}
              {totais(1).kcal.toFixed(0)} kcal · {totais(1).prot.toFixed(0)} g prot
              {"  ·  "}
              <strong className="text-emerald-700 dark:text-emerald-400">
                {person2Name || "P2"}:
              </strong>{" "}
              {totais(2).kcal.toFixed(0)} kcal · {totais(2).prot.toFixed(0)} g prot
            </>
          ) : (
            <>
              Prato:{" "}
              <strong className="text-emerald-700 dark:text-emerald-400">
                {totais(1).cru.toFixed(0)} g crus
              </strong>{" "}
              · {totais(1).kcal.toFixed(0)} kcal · {totais(1).prot.toFixed(0)} g prot
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAjustando((v) => !v)}
          className="rounded-[8px] border border-[#E2D7C4] bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-600 transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          {ajustando ? "✓ Pronto" : "⚙️ Ajustar ingredientes"}
        </button>
      </div>
    </div>
  );
}
