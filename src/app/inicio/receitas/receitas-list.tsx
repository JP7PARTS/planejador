"use client";

import { Food, RecipeWithIngredients } from "@/lib/types";
import { deleteRecipe } from "@/lib/api/recipes";
import { calculateWeekItem } from "@/lib/calc";
import ReceitaForm from "./receita-form";
import { useMemo, useState } from "react";

interface Props {
  recipes: RecipeWithIngredients[];
  alimentos: Food[];
  onRefresh: () => void;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export default function ReceitasList({ recipes, alimentos, onRefresh }: Props) {
  const [editing, setEditing] = useState<RecipeWithIngredients | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const foodsMap = useMemo(() => {
    const m: Record<string, Food> = {};
    alimentos.forEach((f) => (m[f.id] = f));
    return m;
  }, [alimentos]);

  // Nutrição por marmita de uma receita = soma dos ingredientes (1 marmita).
  function nutricao(r: RecipeWithIngredients) {
    let kcal = 0,
      prot = 0;
    r.ingredients.forEach((i) => {
      const food = foodsMap[i.food_id];
      if (!food) return;
      const res = calculateWeekItem(food, i.cooked_grams_per_marmita, 1);
      kcal += res.kcalTotal;
      prot += res.proteinTotal;
    });
    return { kcal, prot };
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que quer deletar esta receita?")) return;
    setDeletandoId(id);
    setErro(null);
    try {
      await deleteRecipe(id);
      onRefresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao deletar");
    } finally {
      setDeletandoId(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[clamp(26px,4vw,34px)] font-bold tracking-tight">
            Receitas
          </h1>
          <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">
            {recipes.length} receita{recipes.length === 1 ? "" : "s"} · pratos
            com ingredientes e modo de preparo
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-xl bg-emerald-600 px-[18px] py-2.5 text-[15px] font-semibold text-white transition hover:bg-emerald-700"
        >
          + Nova receita
        </button>
      </div>

      {erro && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#E7DECD] bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-[15px] text-slate-500 dark:text-slate-400">
            Nenhuma receita ainda. Crie um prato (ex.:{" "}
            <strong>Carne de panela com batata</strong>) para reaproveitar nas
            suas semanas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
          {recipes.map((r) => {
            const n = nutricao(r);
            return (
              <div
                key={r.id}
                className="flex flex-col rounded-[16px] border border-[#EADFCD] bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                style={{ borderLeft: "4px solid #2E6B47" }}
              >
                <p className="text-[16px] font-bold [font-family:var(--font-display)]">
                  {r.title}
                </p>
                <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
                  {r.ingredients.length} ingrediente
                  {r.ingredients.length === 1 ? "" : "s"} · {n.kcal.toFixed(0)}{" "}
                  kcal · {fmt(n.prot)}P{" "}
                  <span className="text-slate-400">(por marmita)</span>
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
                  {r.total_time_min != null && (
                    <span className="rounded-full bg-[#F7F2E9] px-2.5 py-1 font-medium dark:bg-slate-800">
                      ⏱️ {r.total_time_min} min
                    </span>
                  )}
                  {r.pressure_time_min != null && (
                    <span className="rounded-full bg-[#F7F2E9] px-2.5 py-1 font-medium dark:bg-slate-800">
                      ♨️ {r.pressure_time_min} min pressão
                    </span>
                  )}
                  {r.yield_marmitas != null && (
                    <span className="rounded-full bg-[#F7F2E9] px-2.5 py-1 font-medium dark:bg-slate-800">
                      🍱 rende {fmt(r.yield_marmitas)}
                    </span>
                  )}
                </div>

                {r.steps.length > 0 && (
                  <p className="mt-2 line-clamp-2 text-[12.5px] text-slate-500 dark:text-slate-400">
                    {r.steps.length} passo{r.steps.length === 1 ? "" : "s"}:{" "}
                    {r.steps.join(" · ")}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setEditing(r)}
                    className="flex-1 rounded-[9px] border border-[#E7DECD] bg-[#FCFAF5] py-2 text-[13px] font-semibold transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletandoId === r.id}
                    className="rounded-[9px] border border-[#F0DAD2] bg-[#FCF4F1] px-3 py-2 text-[13px] transition hover:brightness-95 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/20"
                    title="Excluir"
                  >
                    {deletandoId === r.id ? "…" : "🗑️"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(editing || isCreating) && (
        <ReceitaForm
          recipe={editing ?? undefined}
          alimentos={alimentos}
          onClose={() => {
            setEditing(null);
            setIsCreating(false);
          }}
          onSuccess={() => {
            setEditing(null);
            setIsCreating(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
