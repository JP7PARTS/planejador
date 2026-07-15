"use client";

import { RecipeWithIngredients } from "@/lib/types";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

interface Props {
  receitas: RecipeWithIngredients[];
  // Se presente, mostra o ✕ para tirar a receita do guia.
  onRemover?: (recipeId: string) => void;
}

// Guia de preparo: por receita, mostra tempos, passos numerados e dicas.
// Usado na tela de montar a semana, na overlay de montagem e no ver/[id].
export default function GuiaPreparo({ receitas, onRemover }: Props) {
  if (receitas.length === 0) return null;

  return (
    <div className="rounded-[20px] border border-[#EADFCD] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-1 text-lg font-bold [font-family:var(--font-display)]">
        📋 Guia de preparo
      </h2>
      <p className="mb-3.5 text-[13px] text-slate-500 dark:text-slate-400">
        Como preparar cada prato antes de montar as marmitas.
      </p>

      <div className="flex flex-col gap-3">
        {receitas.map((r) => (
          <div
            key={r.id}
            className="rounded-[14px] border border-[#EFE7D8] bg-[#FCFAF5] p-4 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15.5px] font-bold [font-family:var(--font-display)]">
                {r.title}
              </p>
              {onRemover && (
                <button
                  type="button"
                  onClick={() => onRemover(r.id)}
                  className="shrink-0 text-rose-600 transition hover:opacity-70"
                  aria-label={`Tirar ${r.title} do guia`}
                  title="Tirar do guia"
                >
                  ✕
                </button>
              )}
            </div>

            {(r.total_time_min != null ||
              r.pressure_time_min != null ||
              r.yield_marmitas != null) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11.5px]">
                {r.total_time_min != null && (
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium dark:bg-slate-800">
                    ⏱️ {r.total_time_min} min
                  </span>
                )}
                {r.pressure_time_min != null && (
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium dark:bg-slate-800">
                    ♨️ {r.pressure_time_min} min pressão
                  </span>
                )}
                {r.yield_marmitas != null && (
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium dark:bg-slate-800">
                    🍱 rende {fmt(r.yield_marmitas)}
                  </span>
                )}
              </div>
            )}

            {r.steps.length > 0 && (
              <ol className="mt-2.5 flex list-decimal flex-col gap-1 pl-5 text-[14px] text-slate-700 dark:text-slate-300">
                {r.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}

            {r.seasonings && r.seasonings.length > 0 && (
              <p className="mt-2.5 text-[13px] text-slate-600 dark:text-slate-300">
                🧅 Temperos:{" "}
                {r.seasonings
                  .map((s) =>
                    s.quantity != null && s.quantity > 0
                      ? `${fmt(s.quantity)}× ${s.name}`
                      : `${s.name} (a gosto)`
                  )
                  .join(" · ")}
              </p>
            )}

            {r.prep_notes && (
              <p className="mt-2.5 rounded-[10px] bg-amber-500/10 px-3 py-2 text-[13px] text-amber-700 dark:text-amber-400">
                💡 {r.prep_notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
