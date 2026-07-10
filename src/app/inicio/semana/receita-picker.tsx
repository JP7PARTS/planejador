"use client";

import { Food, RecipeWithIngredients } from "@/lib/types";
import { calculateWeekItem } from "@/lib/calc";
import Link from "next/link";
import { useMemo } from "react";

interface Props {
  receitas: RecipeWithIngredients[];
  alimentos: Food[];
  onEscolher: (receita: RecipeWithIngredients) => void;
  onClose: () => void;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

// Modal para escolher uma receita salva e jogá-la na semana.
export default function ReceitaPicker({
  receitas,
  alimentos,
  onEscolher,
  onClose,
}: Props) {
  const foodsMap = useMemo(() => {
    const m: Record<string, Food> = {};
    alimentos.forEach((f) => (m[f.id] = f));
    return m;
  }, [alimentos]);

  function kcalPorMarmita(r: RecipeWithIngredients): number {
    let kcal = 0;
    r.ingredients.forEach((i) => {
      const food = foodsMap[i.food_id];
      if (!food) return;
      kcal += calculateWeekItem(food, i.cooked_grams_per_marmita, 1).kcalTotal;
    });
    return kcal;
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(38,34,28,0.5)] p-[18px] backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[460px] overflow-y-auto rounded-[22px] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.5)] dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[21px] font-bold tracking-tight">
            Adicionar receita
          </h2>
          <button
            onClick={onClose}
            className="rounded-[9px] bg-[#EFE7D8] px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:brightness-95 dark:bg-slate-800 dark:text-slate-300"
          >
            ✕
          </button>
        </div>

        {receitas.length === 0 ? (
          <p className="py-4 text-center text-[14.5px] text-slate-500 dark:text-slate-400">
            Nenhuma receita salva ainda.{" "}
            <Link
              href="/inicio/receitas"
              className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Criar em Receitas
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {receitas.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onEscolher(r)}
                className="rounded-[13px] border border-[#EADFCD] bg-[#FCFAF5] p-3.5 text-left transition hover:brightness-[0.98] dark:border-slate-700 dark:bg-slate-800"
              >
                <p className="text-[15px] font-bold [font-family:var(--font-display)]">
                  {r.title}
                </p>
                <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                  {r.ingredients.length} ingrediente
                  {r.ingredients.length === 1 ? "" : "s"} ·{" "}
                  {kcalPorMarmita(r).toFixed(0)} kcal/marmita
                  {r.pressure_time_min != null
                    ? ` · ♨️ ${r.pressure_time_min} min`
                    : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
