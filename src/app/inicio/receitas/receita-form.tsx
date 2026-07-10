"use client";

import { Food, RecipeWithIngredients } from "@/lib/types";
import { createRecipe, updateRecipe, RecipeInput } from "@/lib/api/recipes";
import { calculateWeekItem } from "@/lib/calc";
import AlimentoSelect from "../semana/alimento-select";
import { FormEvent, useMemo, useState } from "react";

interface LinhaIng {
  foodId: string;
  gramsStr: string;
}

interface Props {
  recipe?: RecipeWithIngredients;
  alimentos: Food[];
  onClose: () => void;
  onSuccess: () => void;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export default function ReceitaForm({
  recipe,
  alimentos,
  onClose,
  onSuccess,
}: Props) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [title, setTitle] = useState(recipe?.title ?? "");
  const [linhas, setLinhas] = useState<LinhaIng[]>(
    recipe?.ingredients.length
      ? recipe.ingredients.map((i) => ({
          foodId: i.food_id,
          gramsStr: String(i.cooked_grams_per_marmita),
        }))
      : [{ foodId: "", gramsStr: "100" }]
  );
  const [stepsText, setStepsText] = useState((recipe?.steps ?? []).join("\n"));
  const [totalTime, setTotalTime] = useState(
    recipe?.total_time_min != null ? String(recipe.total_time_min) : ""
  );
  const [pressureTime, setPressureTime] = useState(
    recipe?.pressure_time_min != null ? String(recipe.pressure_time_min) : ""
  );
  const [yieldM, setYieldM] = useState(
    recipe?.yield_marmitas != null ? String(recipe.yield_marmitas) : ""
  );
  const [prepNotes, setPrepNotes] = useState(recipe?.prep_notes ?? "");

  const foodsMap = useMemo(() => {
    const m: Record<string, Food> = {};
    alimentos.forEach((f) => (m[f.id] = f));
    return m;
  }, [alimentos]);

  // Prévia de nutrição por marmita = soma dos ingredientes (1 marmita).
  const nut = useMemo(() => {
    let kcal = 0,
      prot = 0,
      carb = 0,
      fat = 0;
    linhas.forEach((l) => {
      const food = foodsMap[l.foodId];
      const g = Number(l.gramsStr);
      if (!food || !Number.isFinite(g) || g <= 0) return;
      const r = calculateWeekItem(food, g, 1);
      kcal += r.kcalTotal;
      prot += r.proteinTotal;
      carb += r.carbTotal;
      fat += r.fatTotal;
    });
    return { kcal, prot, carb, fat };
  }, [linhas, foodsMap]);

  function atualizarLinha(idx: number, patch: Partial<LinhaIng>) {
    setLinhas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    );
  }
  function adicionarLinha() {
    setLinhas((prev) => [...prev, { foodId: "", gramsStr: "100" }]);
  }
  function removerLinha(idx: number) {
    setLinhas((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    const ingredients = linhas
      .filter((l) => l.foodId && Number(l.gramsStr) > 0)
      .map((l) => ({
        food_id: l.foodId,
        cooked_grams_per_marmita: Number(l.gramsStr),
      }));

    if (!title.trim()) {
      setErro("Dê um nome para a receita.");
      return;
    }
    if (ingredients.length === 0) {
      setErro("Adicione pelo menos um ingrediente com gramas.");
      return;
    }

    const payload: RecipeInput = {
      title: title.trim(),
      steps: stepsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      total_time_min: totalTime === "" ? null : Number(totalTime),
      pressure_time_min: pressureTime === "" ? null : Number(pressureTime),
      yield_marmitas: yieldM === "" ? null : Number(yieldM),
      prep_notes: prepNotes.trim() || null,
      ingredients,
    };

    setCarregando(true);
    try {
      if (recipe) {
        await updateRecipe(recipe.id, payload);
      } else {
        await createRecipe(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido");
      setCarregando(false);
    }
  }

  const bigInput =
    "w-full rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const numInput =
    "w-full rounded-[10px] border border-[#E2D7C4] bg-[#FCFAF5] px-2.5 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const numLabel =
    "mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400";
  const gramsInput =
    "w-[74px] rounded-[10px] border border-[#E2D7C4] bg-white px-2 py-2.5 text-center text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(38,34,28,0.5)] p-[18px] backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[22px] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.5)] dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-[18px] text-[21px] font-bold tracking-tight">
          {recipe ? "Editar receita" : "Nova receita"}
        </h2>

        <form onSubmit={handleSubmit}>
          <label className="mb-1.5 block text-[13px] font-semibold">Nome</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={`${bigInput} mb-4`}
            placeholder="Ex.: Carne de panela com batata"
          />

          {/* Ingredientes */}
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-semibold">
              Ingredientes{" "}
              <span className="font-normal text-slate-400">
                (g prontos por marmita)
              </span>
            </label>
            <button
              type="button"
              onClick={adicionarLinha}
              className="rounded-[9px] bg-[#E9F0E7] px-3 py-1.5 text-[13px] font-semibold text-emerald-700 transition hover:brightness-95 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              + Ingrediente
            </button>
          </div>

          <div className="mb-3 flex flex-col gap-2">
            {linhas.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <AlimentoSelect
                    alimentos={alimentos}
                    value={l.foodId}
                    onChange={(foodId) => atualizarLinha(idx, { foodId })}
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={l.gramsStr}
                  onChange={(e) =>
                    atualizarLinha(idx, { gramsStr: e.target.value })
                  }
                  className={gramsInput}
                  aria-label="Gramas prontos por marmita"
                />
                <button
                  type="button"
                  onClick={() => removerLinha(idx)}
                  className="shrink-0 rounded-[9px] border border-[#F0DAD2] bg-[#FCF4F1] px-2.5 py-2 text-[13px] text-rose-600 transition hover:brightness-95 dark:border-rose-900 dark:bg-rose-950/20"
                  aria-label="Remover ingrediente"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Prévia de nutrição por marmita */}
          <div className="mb-4 rounded-[12px] bg-[#F7F2E9] px-3.5 py-2.5 text-[13px] dark:bg-slate-800">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Por marmita:
            </span>{" "}
            {nut.kcal.toFixed(0)} kcal · {fmt(nut.prot)}P · {fmt(nut.carb)}C ·{" "}
            {fmt(nut.fat)}G
          </div>

          {/* Modo de preparo */}
          <label className="mb-1.5 block text-[13px] font-semibold">
            Modo de preparo{" "}
            <span className="font-normal text-slate-400">(um passo por linha)</span>
          </label>
          <textarea
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            rows={4}
            className={`${bigInput} mb-4`}
            placeholder={"Ex.:\nSelar a carne\n40 min na pressão\nJuntar a batata, 10 min"}
          />

          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <div>
              <label className={numLabel}>Tempo total (min)</label>
              <input
                type="number"
                min="0"
                value={totalTime}
                onChange={(e) => setTotalTime(e.target.value)}
                className={numInput}
                placeholder="—"
              />
            </div>
            <div>
              <label className={numLabel}>Pressão (min)</label>
              <input
                type="number"
                min="0"
                value={pressureTime}
                onChange={(e) => setPressureTime(e.target.value)}
                className={numInput}
                placeholder="—"
              />
            </div>
            <div>
              <label className={numLabel}>Rende (marmitas)</label>
              <input
                type="number"
                min="0"
                value={yieldM}
                onChange={(e) => setYieldM(e.target.value)}
                className={numInput}
                placeholder="—"
              />
            </div>
          </div>

          <label className="mb-1.5 block text-[13px] font-semibold">
            Preparar antes{" "}
            <span className="font-normal text-slate-400">(dicas, opcional)</span>
          </label>
          <textarea
            value={prepNotes}
            onChange={(e) => setPrepNotes(e.target.value)}
            rows={2}
            className={`${bigInput} mb-5`}
            placeholder="Ex.: deixar a carne temperada de véspera"
          />

          {erro && (
            <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              {erro}
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#E2D7C4] bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {carregando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
