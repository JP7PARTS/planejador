"use client";

import { RecipeWithIngredients } from "@/lib/types";

interface Props {
  recipes: RecipeWithIngredients[];
  onSelecionarReceita: (recipeId: string) => void;
  onClose: () => void;
}

export default function RefeicaoRecipePicker({
  recipes,
  onSelecionarReceita,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(38,34,28,0.5)] p-[18px] backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-[420px] overflow-y-auto rounded-[22px] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.5)] dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-[21px] font-bold tracking-tight">
          Selecionar receita
        </h2>

        {recipes.length === 0 ? (
          <p className="text-center text-[15px] text-slate-500 dark:text-slate-400">
            Nenhuma receita disponível. Crie uma receita primeiro.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => {
                  onSelecionarReceita(recipe.id);
                }}
                className="flex flex-col items-start gap-1 rounded-[12px] border border-[#E2D7C4] bg-[#FCFAF5] p-4 text-left transition hover:border-emerald-600 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-slate-700"
              >
                <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  {recipe.title}
                </p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  {recipe.ingredients?.length || 0} ingrediente
                  {recipe.ingredients?.length === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-[#E2D7C4] bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
