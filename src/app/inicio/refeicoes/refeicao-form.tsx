"use client";

import { Event, RecipeWithIngredients, Food } from "@/lib/types";
import { createEvent, updateEvent, getEvent, calcularListaCompras, tempoMaximo } from "@/lib/api/events";
import { agruparIngredientes } from "@/lib/api/recipes";
import { useState, useMemo, useEffect, FormEvent } from "react";
import RefeicaoRecipePicker from "./refeicao-recipe-picker";

interface LinhaReceita {
  recipe_id: string;
  people_count: number;
  choices: Record<number, string>; // choice_group → food_id escolhido
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
  const [linhas, setLinhas] = useState<LinhaReceita[]>([]);
  const [pickerAberto, setPickerAberto] = useState(false);

  // Ao editar, carrega as receitas realmente salvas neste evento.
  useEffect(() => {
    if (!event) return;
    let cancelado = false;
    getEvent(event.id)
      .then((completo) => {
        if (cancelado) return;
        const carregadas = (completo.event_recipes ?? [])
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((er) => {
            // Normaliza as chaves (JSON traz string) para number.
            const choices: Record<number, string> = {};
            Object.entries(er.choices ?? {}).forEach(([g, fid]) => {
              choices[Number(g)] = fid as string;
            });
            return {
              recipe_id: er.recipe_id,
              people_count: er.people_count,
              choices,
            };
          });
        setLinhas(carregadas);
      })
      .catch((err) => {
        setErro(err instanceof Error ? err.message : "Erro ao carregar refeição");
      });
    return () => {
      cancelado = true;
    };
  }, [event]);

  const recipesMap = useMemo(() => {
    const m: Record<string, RecipeWithIngredients> = {};
    recipes.forEach((r) => (m[r.id] = r));
    return m;
  }, [recipes]);

  const foodsMap = useMemo(() => {
    const m: Record<string, Food> = {};
    foods.forEach((f) => (m[f.id] = f));
    return m;
  }, [foods]);

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
        choices: linha.choices as Record<string, string>,
        recipe: recipesMap[linha.recipe_id],
      }))
      .filter((er) => er.recipe);
  }, [linhas, recipesMap]);

  // Lista de compras consolidada
  const listaCompras = useMemo(() => {
    return calcularListaCompras(eventRecipesComReceitas, foods);
  }, [eventRecipesComReceitas, foods]);

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
    // Pré-seleciona a 1ª opção de cada escolha da receita.
    const receita = recipesMap[recipeId];
    const iniciais: Record<number, string> = {};
    if (receita) {
      agruparIngredientes(receita.ingredients).escolhas.forEach((e) => {
        iniciais[e.group] = e.food_ids[0];
      });
    }
    setLinhas((prev) => [
      ...prev,
      { recipe_id: recipeId, people_count: Number(basePeopleCount), choices: iniciais },
    ]);
    setPickerAberto(false);
  }

  function atualizarChoice(idx: number, group: number, foodId: string) {
    setLinhas((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, choices: { ...l.choices, [group]: foodId } } : l
      )
    );
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
        choices: l.choices as Record<string, string>,
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
                const escolhas = r
                  ? agruparIngredientes(r.ingredients).escolhas
                  : [];
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] p-3 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
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

                    {/* Ingredientes "à escolha" (ex.: qual carne) */}
                    {escolhas.map((e) => (
                      <div key={e.group} className="flex items-center gap-2 pl-0.5">
                        <label className="w-[70px] shrink-0 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">
                          {e.label}
                        </label>
                        <select
                          value={l.choices[e.group] ?? e.food_ids[0]}
                          onChange={(ev) => atualizarChoice(idx, e.group, ev.target.value)}
                          className="min-w-0 flex-1 cursor-pointer rounded-[9px] border border-[#E2D7C4] bg-white px-2.5 py-1.5 text-[13px] text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {e.food_ids.map((fid) => (
                            <option key={fid} value={fid}>
                              {foodsMap[fid]?.name ?? "—"}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
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

                {tempoTotal && (
                  <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-300">
                    ⏱️ Tempo total: <strong>{tempoTotal} min</strong>
                  </p>
                )}

                <p className="mt-2 border-t border-[#E2D7C4] pt-2 text-[11.5px] italic text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  📝 O modo de preparo completo aparece ao abrir a refeição
                  salva.
                </p>
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
