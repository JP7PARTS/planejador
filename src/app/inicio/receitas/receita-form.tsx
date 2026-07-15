"use client";

import { Food, RecipeWithIngredients } from "@/lib/types";
import {
  createRecipe,
  updateRecipe,
  agruparIngredientes,
  RecipeInput,
} from "@/lib/api/recipes";
import { calculateWeekItem } from "@/lib/calc";
import AlimentoSelect from "../semana/alimento-select";
import { FormEvent, useMemo, useState } from "react";

interface LinhaIng {
  foodId: string;
  gramsStr: string;
}

interface EscolhaForm {
  label: string;
  gramsStr: string;
  foodIds: string[];
}

interface TemperoForm {
  name: string;
  qtyStr: string; // vazio = "a gosto"
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

  const agrupado = recipe ? agruparIngredientes(recipe.ingredients) : null;

  const [title, setTitle] = useState(recipe?.title ?? "");
  const [linhas, setLinhas] = useState<LinhaIng[]>(
    agrupado
      ? agrupado.fixos.map((i) => ({
          foodId: i.food_id,
          gramsStr: String(i.cooked_grams_per_marmita),
        }))
      : [{ foodId: "", gramsStr: "100" }]
  );
  const [escolhas, setEscolhas] = useState<EscolhaForm[]>(
    agrupado
      ? agrupado.escolhas.map((e) => ({
          label: e.label,
          gramsStr: String(e.cooked_grams_per_marmita),
          foodIds: e.food_ids,
        }))
      : []
  );

  // Ingrediente principal (puxa a proporção na semana). Default = o marcado na
  // receita; nenhum ao criar. Índices referem-se a `linhas`/`escolhas`.
  const principalInicial: { tipo: "fixo" | "escolha"; idx: number } | null =
    (() => {
      if (!agrupado) return null;
      const fi = agrupado.fixos.findIndex((f) => f.is_principal);
      if (fi !== -1) return { tipo: "fixo", idx: fi };
      const ci = agrupado.escolhas.findIndex((c) => c.is_principal);
      if (ci !== -1) return { tipo: "escolha", idx: ci };
      return null;
    })();
  const [principal, setPrincipal] = useState(principalInicial);

  const ehPrincipal = (tipo: "fixo" | "escolha", idx: number) =>
    principal?.tipo === tipo && principal.idx === idx;
  const marcarPrincipal = (tipo: "fixo" | "escolha", idx: number) =>
    setPrincipal((p) =>
      p && p.tipo === tipo && p.idx === idx ? null : { tipo, idx }
    );
  const [temperos, setTemperos] = useState<TemperoForm[]>(
    (recipe?.seasonings ?? []).map((s) => ({
      name: s.name,
      qtyStr: s.quantity != null ? String(s.quantity) : "",
    }))
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

  // Prévia de nutrição por marmita = fixos + a 1ª opção de cada escolha.
  const nut = useMemo(() => {
    let kcal = 0,
      prot = 0,
      carb = 0,
      fat = 0;
    const somar = (foodId: string, gStr: string) => {
      const food = foodsMap[foodId];
      const g = Number(gStr);
      if (!food || !Number.isFinite(g) || g <= 0) return;
      const r = calculateWeekItem(food, g, 1);
      kcal += r.kcalTotal;
      prot += r.proteinTotal;
      carb += r.carbTotal;
      fat += r.fatTotal;
    };
    linhas.forEach((l) => somar(l.foodId, l.gramsStr));
    escolhas.forEach((e) => {
      if (e.foodIds[0]) somar(e.foodIds[0], e.gramsStr);
    });
    return { kcal, prot, carb, fat };
  }, [linhas, escolhas, foodsMap]);

  // ---- Ingredientes fixos ----
  function atualizarLinha(idx: number, patch: Partial<LinhaIng>) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function adicionarLinha() {
    setLinhas((prev) => [...prev, { foodId: "", gramsStr: "100" }]);
  }
  function removerLinha(idx: number) {
    setLinhas((prev) => prev.filter((_, i) => i !== idx));
    setPrincipal((p) => {
      if (!p || p.tipo !== "fixo") return p;
      if (p.idx === idx) return null;
      return p.idx > idx ? { ...p, idx: p.idx - 1 } : p;
    });
  }

  // ---- Escolhas ----
  function atualizarEscolha(idx: number, patch: Partial<EscolhaForm>) {
    setEscolhas((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function adicionarEscolha() {
    setEscolhas((prev) => [...prev, { label: "", gramsStr: "120", foodIds: [] }]);
  }
  function removerEscolha(idx: number) {
    setEscolhas((prev) => prev.filter((_, i) => i !== idx));
    setPrincipal((p) => {
      if (!p || p.tipo !== "escolha") return p;
      if (p.idx === idx) return null;
      return p.idx > idx ? { ...p, idx: p.idx - 1 } : p;
    });
  }

  // ---- Temperos & aromáticos ----
  function atualizarTempero(idx: number, patch: Partial<TemperoForm>) {
    setTemperos((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }
  function adicionarTempero() {
    setTemperos((prev) => [...prev, { name: "", qtyStr: "" }]);
  }
  function removerTempero(idx: number) {
    setTemperos((prev) => prev.filter((_, i) => i !== idx));
  }
  function adicionarOpcao(idx: number, foodId: string) {
    if (!foodId) return;
    setEscolhas((prev) =>
      prev.map((e, i) =>
        i === idx && !e.foodIds.includes(foodId)
          ? { ...e, foodIds: [...e.foodIds, foodId] }
          : e
      )
    );
  }
  function removerOpcao(idx: number, foodId: string) {
    setEscolhas((prev) =>
      prev.map((e, i) =>
        i === idx ? { ...e, foodIds: e.foodIds.filter((f) => f !== foodId) } : e
      )
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    const ingredients = linhas
      .map((l, idx) => ({ l, idx }))
      .filter(({ l }) => l.foodId && Number(l.gramsStr) > 0)
      .map(({ l, idx }) => ({
        food_id: l.foodId,
        cooked_grams_per_marmita: Number(l.gramsStr),
        is_principal: ehPrincipal("fixo", idx),
      }));

    const choices = escolhas
      .map((c, idx) => ({ c, idx }))
      .filter(
        ({ c }) => c.label.trim() && c.foodIds.length > 0 && Number(c.gramsStr) > 0
      )
      .map(({ c, idx }) => ({
        label: c.label.trim(),
        cooked_grams_per_marmita: Number(c.gramsStr),
        food_ids: c.foodIds,
        is_principal: ehPrincipal("escolha", idx),
      }));

    if (!title.trim()) {
      setErro("Dê um nome para a receita.");
      return;
    }
    if (ingredients.length === 0 && choices.length === 0) {
      setErro("Adicione pelo menos um ingrediente ou uma escolha.");
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
      choices,
      seasonings: temperos
        .filter((t) => t.name.trim())
        .map((t) => {
          const q = Number(t.qtyStr);
          return {
            name: t.name.trim(),
            quantity:
              t.qtyStr.trim() === "" || !Number.isFinite(q) || q <= 0 ? null : q,
          };
        }),
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
  const removerBtn =
    "shrink-0 rounded-[9px] border border-[#F0DAD2] bg-[#FCF4F1] px-2.5 py-2 text-[13px] text-rose-600 transition hover:brightness-95 dark:border-rose-900 dark:bg-rose-950/20";

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

          {/* Ingredientes fixos */}
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

          <div className="mb-4 flex flex-col gap-2">
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
                  onChange={(e) => atualizarLinha(idx, { gramsStr: e.target.value })}
                  className={gramsInput}
                  aria-label="Gramas prontos por marmita"
                />
                <button
                  type="button"
                  onClick={() => marcarPrincipal("fixo", idx)}
                  title={
                    ehPrincipal("fixo", idx)
                      ? "Ingrediente principal"
                      : "Marcar como principal"
                  }
                  aria-label="Marcar como principal"
                  className={
                    "shrink-0 rounded-[9px] border px-2 py-2 text-[13px] transition " +
                    (ehPrincipal("fixo", idx)
                      ? "border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/30"
                      : "border-[#E2D7C4] bg-white text-slate-300 hover:text-amber-400 dark:border-slate-700 dark:bg-slate-900")
                  }
                >
                  {ehPrincipal("fixo", idx) ? "⭐" : "☆"}
                </button>
                <button
                  type="button"
                  onClick={() => removerLinha(idx)}
                  className={removerBtn}
                  aria-label="Remover ingrediente"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="-mt-2.5 mb-4 text-[11.5px] text-slate-400">
            ⭐ marca o ingrediente <strong>principal</strong> — é ele que puxa a
            proporção ao escalar o prato na semana.
          </p>

          {/* Escolhas (ingredientes que variam) */}
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-semibold">
              Escolhas{" "}
              <span className="font-normal text-slate-400">
                (ex.: a carne — você decide na hora)
              </span>
            </label>
            <button
              type="button"
              onClick={adicionarEscolha}
              className="rounded-[9px] bg-[#E9F0E7] px-3 py-1.5 text-[13px] font-semibold text-emerald-700 transition hover:brightness-95 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              + Escolha
            </button>
          </div>

          <div className="mb-4 flex flex-col gap-3">
            {escolhas.length === 0 && (
              <p className="text-[12.5px] text-slate-400">
                Nenhuma escolha. Use quando um ingrediente pode variar (ex.:
                Carne → patinho, acém, músculo).
              </p>
            )}
            {escolhas.map((esc, idx) => (
              <div
                key={idx}
                className="rounded-[12px] border border-[#EFE7D8] bg-[#FCFAF5] p-3 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={esc.label}
                    onChange={(e) => atualizarEscolha(idx, { label: e.target.value })}
                    placeholder="Nome (ex.: Carne)"
                    className="min-w-0 flex-1 rounded-[10px] border border-[#E2D7C4] bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={esc.gramsStr}
                    onChange={(e) => atualizarEscolha(idx, { gramsStr: e.target.value })}
                    className={gramsInput}
                    aria-label="Gramas prontos por marmita"
                  />
                  <button
                    type="button"
                    onClick={() => marcarPrincipal("escolha", idx)}
                    title={
                      ehPrincipal("escolha", idx)
                        ? "Escolha principal"
                        : "Marcar como principal"
                    }
                    aria-label="Marcar como principal"
                    className={
                      "shrink-0 rounded-[9px] border px-2 py-2 text-[13px] transition " +
                      (ehPrincipal("escolha", idx)
                        ? "border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/30"
                        : "border-[#E2D7C4] bg-white text-slate-300 hover:text-amber-400 dark:border-slate-700 dark:bg-slate-900")
                    }
                  >
                    {ehPrincipal("escolha", idx) ? "⭐" : "☆"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removerEscolha(idx)}
                    className={removerBtn}
                    aria-label="Remover escolha"
                  >
                    ✕
                  </button>
                </div>

                {/* Opções da escolha */}
                {esc.foodIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {esc.foodIds.map((fid) => (
                      <span
                        key={fid}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DECD] bg-white px-2.5 py-1 text-[13px] font-medium dark:border-slate-700 dark:bg-slate-900"
                      >
                        {foodsMap[fid]?.name ?? "—"}
                        <button
                          type="button"
                          onClick={() => removerOpcao(idx, fid)}
                          className="text-rose-600 hover:opacity-70"
                          aria-label="Remover opção"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2">
                  <AlimentoSelect
                    alimentos={alimentos}
                    value=""
                    onChange={(foodId) => adicionarOpcao(idx, foodId)}
                  />
                  <p className="mt-1 text-[11.5px] text-slate-400">
                    Escolha um alimento para adicionar como opção.
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Temperos & aromáticos */}
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-semibold">
              Temperos & aromáticos{" "}
              <span className="font-normal text-slate-400">
                (cebola, alho, sal…)
              </span>
            </label>
            <button
              type="button"
              onClick={adicionarTempero}
              className="rounded-[9px] bg-[#E9F0E7] px-3 py-1.5 text-[13px] font-semibold text-emerald-700 transition hover:brightness-95 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              + Tempero
            </button>
          </div>
          <div className="mb-1.5 flex flex-col gap-2">
            {temperos.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => atualizarTempero(idx, { name: e.target.value })}
                  placeholder="Ex.: cebola, dente de alho, sal"
                  className="min-w-0 flex-1 rounded-[10px] border border-[#E2D7C4] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={t.qtyStr}
                  onChange={(e) => atualizarTempero(idx, { qtyStr: e.target.value })}
                  placeholder="qtd"
                  title="Quantidade (vazio = a gosto)"
                  className={`${gramsInput} w-[70px]`}
                />
                <button
                  type="button"
                  onClick={() => removerTempero(idx)}
                  className={removerBtn}
                  aria-label="Remover tempero"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="mb-4 text-[11.5px] text-slate-400">
            Quantidade aproximada (vazio = a gosto). Não entram na nutrição — são
            só referência na lista de compras.
          </p>

          {/* Prévia de nutrição por marmita */}
          <div className="mb-4 rounded-[12px] bg-[#F7F2E9] px-3.5 py-2.5 text-[13px] dark:bg-slate-800">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Por marmita:
            </span>{" "}
            {nut.kcal.toFixed(0)} kcal · {fmt(nut.prot)}P · {fmt(nut.carb)}C ·{" "}
            {fmt(nut.fat)}G
            {escolhas.length > 0 && (
              <span className="text-slate-400"> (usando a 1ª opção)</span>
            )}
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
