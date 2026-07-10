"use client";

import { Food, RecipeWithIngredients } from "@/lib/types";
import { calculateWeekItem } from "@/lib/calc";
import { agruparIngredientes } from "@/lib/api/recipes";
import Link from "next/link";
import { useMemo, useState } from "react";

// Uma opção de escolha resolvida (a que o usuário selecionou) + as gramas.
export interface EscolhaResolvida {
  food_id: string;
  cooked_grams_per_marmita: number;
}

interface Props {
  receitas: RecipeWithIngredients[];
  alimentos: Food[];
  onEscolher: (
    receita: RecipeWithIngredients,
    escolhas: EscolhaResolvida[]
  ) => void;
  onClose: () => void;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

// Modal para escolher uma receita salva e jogá-la na semana. Se a receita tem
// ingredientes "à escolha", pede para escolher uma opção de cada antes.
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

  // Receita em configuração (quando tem escolhas) + a opção selecionada por grupo.
  const [config, setConfig] = useState<RecipeWithIngredients | null>(null);
  const [selecoes, setSelecoes] = useState<Record<number, string>>({});

  function kcalPorMarmita(r: RecipeWithIngredients): number {
    const { fixos, escolhas } = agruparIngredientes(r.ingredients);
    let kcal = 0;
    const somar = (foodId: string, g: number) => {
      const food = foodsMap[foodId];
      if (food) kcal += calculateWeekItem(food, g, 1).kcalTotal;
    };
    fixos.forEach((i) => somar(i.food_id, i.cooked_grams_per_marmita));
    escolhas.forEach((e) => {
      if (e.food_ids[0]) somar(e.food_ids[0], e.cooked_grams_per_marmita);
    });
    return kcal;
  }

  function aoClicarReceita(r: RecipeWithIngredients) {
    const { escolhas } = agruparIngredientes(r.ingredients);
    if (escolhas.length === 0) {
      onEscolher(r, []);
      return;
    }
    // Pré-seleciona a 1ª opção de cada escolha e abre o passo de configuração.
    const iniciais: Record<number, string> = {};
    escolhas.forEach((e) => (iniciais[e.group] = e.food_ids[0]));
    setSelecoes(iniciais);
    setConfig(r);
  }

  function confirmarConfig() {
    if (!config) return;
    const { escolhas } = agruparIngredientes(config.ingredients);
    const resolvidas: EscolhaResolvida[] = escolhas.map((e) => ({
      food_id: selecoes[e.group] || e.food_ids[0],
      cooked_grams_per_marmita: e.cooked_grams_per_marmita,
    }));
    onEscolher(config, resolvidas);
  }

  const escolhasConfig = config
    ? agruparIngredientes(config.ingredients).escolhas
    : [];

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
            {config ? config.title : "Adicionar receita"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-[9px] bg-[#EFE7D8] px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:brightness-95 dark:bg-slate-800 dark:text-slate-300"
          >
            ✕
          </button>
        </div>

        {config ? (
          /* Passo de escolha das opções */
          <div>
            <p className="mb-3 text-[13.5px] text-slate-500 dark:text-slate-400">
              Escolha as opções deste prato:
            </p>
            <div className="flex flex-col gap-3">
              {escolhasConfig.map((e) => (
                <div key={e.group}>
                  <label className="mb-1 block text-[13px] font-semibold">
                    {e.label}{" "}
                    <span className="font-normal text-slate-400">
                      ({fmt(e.cooked_grams_per_marmita)} g/marmita)
                    </span>
                  </label>
                  <select
                    value={selecoes[e.group] ?? e.food_ids[0]}
                    onChange={(ev) =>
                      setSelecoes((prev) => ({
                        ...prev,
                        [e.group]: ev.target.value,
                      }))
                    }
                    className="w-full cursor-pointer rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] px-3.5 py-2.5 text-[15px] text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfig(null)}
                className="flex-1 rounded-xl border border-[#E2D7C4] bg-white px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmarConfig}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700"
              >
                Adicionar à semana
              </button>
            </div>
          </div>
        ) : receitas.length === 0 ? (
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
            {receitas.map((r) => {
              const { escolhas } = agruparIngredientes(r.ingredients);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => aoClicarReceita(r)}
                  className="rounded-[13px] border border-[#EADFCD] bg-[#FCFAF5] p-3.5 text-left transition hover:brightness-[0.98] dark:border-slate-700 dark:bg-slate-800"
                >
                  <p className="text-[15px] font-bold [font-family:var(--font-display)]">
                    {r.title}
                    {escolhas.length > 0 && (
                      <span className="ml-1.5 rounded-full bg-emerald-600/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        escolher
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                    {kcalPorMarmita(r).toFixed(0)} kcal/marmita
                    {r.pressure_time_min != null
                      ? ` · ♨️ ${r.pressure_time_min} min`
                      : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
