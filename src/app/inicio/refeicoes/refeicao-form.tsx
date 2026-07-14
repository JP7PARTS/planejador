"use client";

import { Event, RecipeWithIngredients, Food } from "@/lib/types";
import { createEvent, updateEvent, calcularListaCompras, agruparReceitasPorTitulo, tempoMaximo } from "@/lib/api/events";
import { useState, useMemo, FormEvent } from "react";
import RefeicaoRecipePicker from "./refeicao-recipe-picker";

interface LinhaReceita {
  recipe_id: string;
  people_count: number;
}

interface Props {
  event?: Event;
  recipes: RecipeWithIngredients[];
  foods: Food[];
  onClose: () => void;
  onSuccess: () => void;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export default function RefeicaoForm({
  event,
  recipes,
  foods,
  onClose,
  onSuccess,
}: Props) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [title, setTitle] = useState(event?.title ?? "");
  const [eventDate, setEventDate] = useState(event?.event_date ?? "");
  const [basePeopleCount, setBasePeopleCount] = useState(
    String(event?.base_people_count ?? 7)
  );
  const [linhas, setLinhas] = useState<LinhaReceita[]>(
    event ? recipes.map((r) => ({ recipe_id: r.id, people_count: event.base_people_count })) : []
  );
  const [pickerAberto, setPickerAberto] = useState(false);

  const recipesMap = useMemo(() => {
    const m: Record<string, RecipeWithIngredients> = {};
    recipes.forEach((r) => (m[r.id] = r));
    return m;
  }, [recipes]);

  // Constrói array de EventRecipe com recipes populadas
  const eventRecipesComReceitas = useMemo(() => {
    return linhas
      .map((linha) => ({
        id: "",
        event_id: "",
        recipe_id: linha.recipe_id,
        people_count: linha.people_count,
        order_index: 0,
        created_at: "",
        recipe: recipesMap[linha.recipe_id],
      }))
      .filter((er) => er.recipe);
  }, [linhas, recipesMap]);

  // Lista de compras consolidada
  const listaCompras = useMemo(() => {
    return calcularListaCompras(eventRecipesComReceitas, foods);
  }, [eventRecipesComReceitas, foods]);

  // Modo de preparo
  const receitasAgrupadasPorTitulo = useMemo(() => {
    return agruparReceitasPorTitulo(eventRecipesComReceitas);
  }, [eventRecipesComReceitas]);

  // Tempo máximo
  const tempoTotal = useMemo(() => {
    return tempoMaximo(eventRecipesComReceitas);
  }, [eventRecipesComReceitas]);

  function atualizarPeopleCount(idx: number, value: number) {
    setLinhas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, people_count: value } : l))
    );
  }

  function removerLinha(idx: number) {
    setLinhas((prev) => prev.filter((_, i) => i !== idx));
  }

  function adicionarReceita(recipeId: string) {
    if (linhas.some((l) => l.recipe_id === recipeId)) {
      setErro("Esta receita já foi adicionada");
      return;
    }
    setLinhas((prev) => [
      ...prev,
      { recipe_id: recipeId, people_count: Number(basePeopleCount) },
    ]);
    setPickerAberto(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!title.trim()) {
      setErro("Nome da refeição é obrigatório");
      return;
    }

    if (linhas.length === 0) {
      setErro("Adicione pelo menos uma receita");
      return;
    }

    const payload = {
      title: title.trim(),
      event_date: eventDate || null,
      base_people_count: Number(basePeopleCount) || 1,
      recipe_ids: linhas.map((l, idx) => ({
        recipe_id: l.recipe_id,
        people_count: l.people_count,
        order_index: idx,
      })),
    };

    setCarregando(true);
    try {
      if (event) {
        await updateEvent(event.id, payload);
      } else {
        await createEvent(payload);
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

  return (
    <>
      <div
        className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(38,34,28,0.5)] p-[18px] backdrop-blur-[3px]"
        onClick={onClose}
      >
        <div
          className="max-h-[92vh] w-full max-w-[540px] overflow-y-auto rounded-[22px] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.5)] dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-[18px] text-[21px] font-bold tracking-tight">
            {event ? "Editar refeição" : "Nova refeição"}
          </h2>

          <form onSubmit={handleSubmit}>
            <label className="mb-1.5 block text-[13px] font-semibold">
              Nome da refeição
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={`${bigInput} mb-4`}
              placeholder="Ex.: Janta com amigos"
            />

            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">
                  Data (opcional)
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className={bigInput}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold">
                  Quantas pessoas
                </label>
                <input
                  type="number"
                  min="1"
                  value={basePeopleCount}
                  onChange={(e) => setBasePeopleCount(e.target.value)}
                  className={bigInput}
                />
              </div>
            </div>

            {/* Receitas */}
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-semibold">
                Receitas{" "}
                <span className="font-normal text-slate-400">
                  ({linhas.length})
                </span>
              </label>
              <button
                type="button"
                onClick={() => setPickerAberto(true)}
                className="rounded-[9px] bg-[#E9F0E7] px-3 py-1.5 text-[13px] font-semibold text-emerald-700 transition hover:brightness-95 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                + Receita
              </button>
            </div>

            <div className="mb-4 flex flex-col gap-2">
              {linhas.map((l, idx) => {
                const r = recipesMap[l.recipe_id];
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] p-3 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">{r?.title}</p>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={l.people_count}
                      onChange={(e) => atualizarPeopleCount(idx, Number(e.target.value))}
                      className="w-[60px] rounded-[9px] border border-[#E2D7C4] bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      title="Pessoas"
                    />
                    <button
                      type="button"
                      onClick={() => removerLinha(idx)}
                      className="shrink-0 rounded-[9px] border border-[#F0DAD2] bg-[#FCF4F1] px-2.5 py-1.5 text-[13px] text-rose-600 transition hover:brightness-95 dark:border-rose-900 dark:bg-rose-950/20"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Preview */}
            {linhas.length > 0 && (
              <div className="mb-4 rounded-[12px] border border-[#E2D7C4] bg-[#FCFAF5] p-3.5 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                  📋 LISTA DE COMPRAS
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {listaCompras.slice(0, 5).map((item) => (
                    <span
                      key={item.food_id}
                      className="text-[12px] text-slate-500 dark:text-slate-400"
                    >
                      {item.quantity_kg >= 1
                        ? fmt(item.quantity_kg) + " kg"
                        : item.quantity_grams + " g"}{" "}
                      {item.food_name}
                      {listaCompras.length > 5 && "·"}
                    </span>
                  ))}
                  {listaCompras.length > 5 && (
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                      +{listaCompras.length - 5} itens
                    </span>
                  )}
                </div>

                {receitasAgrupadasPorTitulo.length > 0 && (
                  <div className="mt-2 border-t border-[#E2D7C4] pt-2 dark:border-slate-700">
                    <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                      📝 MODO DE PREPARO
                    </p>
                    <div className="mt-1 flex flex-col gap-1.5">
                      {receitasAgrupadasPorTitulo.map((r) => (
                        <div key={r.title} className="text-[11px]">
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {r.title}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            {r.steps.length} passo{r.steps.length === 1 ? "" : "s"}
                            {r.total_time_min && ` · ${r.total_time_min} min`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tempoTotal && (
                  <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-300">
                    ⏱️ Tempo total: <strong>{tempoTotal} min</strong>
                  </p>
                )}
              </div>
            )}

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

      {pickerAberto && (
        <RefeicaoRecipePicker
          recipes={recipes}
          onSelecionarReceita={adicionarReceita}
          onClose={() => setPickerAberto(false)}
        />
      )}
    </>
  );
}
