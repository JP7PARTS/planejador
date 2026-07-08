"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getHouseholdSummary,
  HouseholdSummary,
  HouseholdItem,
} from "@/lib/api/household";
import { calculateWeekSummary, buildShoppingList, WeekItem } from "@/lib/calc";
import { Food } from "@/lib/types";
import ListaCompras from "../semana/lista-compras";
import ResumoPessoa from "../semana/resumo-pessoa";

type Periodo = "7d" | "mes" | "tudo" | "custom";

// Monta um WeekSummary a partir de um subconjunto de itens cros do casal.
function resumoDeItens(items: HouseholdItem[], numMarmitas: number) {
  const foodsMap: Record<string, Food> = {};
  items.forEach((it) => {
    foodsMap[it.food_id] = {
      id: it.food_id,
      name: it.food_name,
      category: it.category,
      fc: it.fc,
      kcal_per_100g: it.kcal_per_100g,
      protein_g_per_100g: it.protein_g_per_100g,
      carb_g_per_100g: it.carb_g_per_100g,
      fat_g_per_100g: it.fat_g_per_100g,
    } as Food;
  });
  const weekItems: WeekItem[] = items.map((it) => ({
    foodId: it.food_id,
    cookedGramsPerMarmita: it.cooked_grams_per_marmita,
    numMarmitas: it.num_marmitas,
  }));
  return calculateWeekSummary(weekItems, foodsMap, numMarmitas || 1);
}

// Total de marmitas de um conjunto de itens: soma weeks.num_marmitas uma vez
// por semana (deduplica pelo week_id).
function totalMarmitas(items: HouseholdItem[]): number {
  const porSemana = new Map<string, number>();
  items.forEach((it) => {
    if (!porSemana.has(it.week_id)) {
      porSemana.set(it.week_id, it.week_num_marmitas);
    }
  });
  let soma = 0;
  porSemana.forEach((v) => (soma += v));
  return soma;
}

export default function ConsolidacaoPage() {
  const [dados, setDados] = useState<HouseholdSummary | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  const carregarResumo = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);
      const data = await getHouseholdSummary();
      setDados(data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  // Itens dentro do período escolhido (filtra por week_created_at).
  const itensFiltrados = useMemo(() => {
    const itens = dados?.items ?? [];
    if (periodo === "tudo") return itens;

    return itens.filter((it) => {
      const d = new Date(it.week_created_at);
      if (periodo === "7d") {
        const from = new Date();
        from.setDate(from.getDate() - 7);
        return d >= from;
      }
      if (periodo === "mes") {
        const from = new Date();
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        return d >= from;
      }
      // custom
      if (dataDe && d < new Date(dataDe + "T00:00:00")) return false;
      if (dataAte && d > new Date(dataAte + "T23:59:59")) return false;
      return true;
    });
  }, [dados, periodo, dataDe, dataAte]);

  const marmitasPeriodo = totalMarmitas(itensFiltrados);
  const resumoTotal = resumoDeItens(itensFiltrados, marmitasPeriodo);

  // Divisão por pessoa (dono da semana).
  const porPessoa = useMemo(() => {
    const membros = dados?.members ?? [];
    return membros
      .map((m) => {
        const itens = itensFiltrados.filter((it) => it.owner_id === m.id);
        return {
          id: m.id,
          nome: m.name,
          resumo: resumoDeItens(itens, totalMarmitas(itens)),
        };
      })
      .filter((p) => p.resumo.items.length > 0);
  }, [dados, itensFiltrados]);

  const chavePeriodo =
    periodo === "custom" ? `custom-${dataDe}-${dataAte}` : periodo;

  const temItens = itensFiltrados.length > 0;

  const botaoPeriodo = (valor: Periodo, rotulo: string) => (
    <button
      onClick={() => setPeriodo(valor)}
      className={
        "rounded-full px-3 py-1.5 text-sm font-medium transition " +
        (periodo === valor
          ? "bg-emerald-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")
      }
    >
      {rotulo}
    </button>
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Totais do Casal</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Escolha um período e veja as compras juntas e por pessoa
          </p>
        </div>
      </header>

      {erro && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando totais…
        </p>
      ) : dados ? (
        <>
          {/* Membros do Casal */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold">Membros do Casal</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {dados.members.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                >
                  👤 {user.name}
                </span>
              ))}
            </div>
          </div>

          {/* Filtro de período */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold">📅 Período</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {botaoPeriodo("7d", "Últimos 7 dias")}
              {botaoPeriodo("mes", "Este mês")}
              {botaoPeriodo("tudo", "Tudo")}
              {botaoPeriodo("custom", "Escolher datas")}
            </div>

            {periodo === "custom" && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium">De</label>
                  <input
                    type="date"
                    value={dataDe}
                    onChange={(e) => setDataDe(e.target.value)}
                    className="mt-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Até</label>
                  <input
                    type="date"
                    value={dataAte}
                    onChange={(e) => setDataAte(e.target.value)}
                    className="mt-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {!temItens ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Nenhuma semana do casal neste período.
            </div>
          ) : (
            <>
              {/* JUNTO: lista de compras combinada (agrupada por categoria) */}
              <ListaCompras
                titulo="Compras do Casal"
                itens={buildShoppingList(resumoTotal)}
                storageKey={"casal-" + chavePeriodo}
              />

              {/* Nutrição combinada */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
                <h2 className="mb-3 text-lg font-semibold text-blue-900 dark:text-blue-100">
                  🥗 Nutrição Combinada
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Total kcal
                    </p>
                    <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                      {resumoTotal.totalKcal.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Total proteína
                    </p>
                    <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                      {resumoTotal.totalProtein.toFixed(1)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Total carbs
                    </p>
                    <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                      {resumoTotal.totalCarb.toFixed(1)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Total gordura
                    </p>
                    <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                      {resumoTotal.totalFat.toFixed(1)}g
                    </p>
                  </div>
                </div>

                {marmitasPeriodo > 0 && (
                  <div className="mt-4 border-t border-blue-200 pt-4 dark:border-blue-900">
                    <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                      Média por marmita do casal ({marmitasPeriodo} no total)
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">kcal</p>
                        <p className="font-semibold text-blue-700 dark:text-blue-300">
                          {resumoTotal.avgKcalPerMarmita.toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">prot</p>
                        <p className="font-semibold text-blue-700 dark:text-blue-300">
                          {resumoTotal.avgProteinPerMarmita.toFixed(1)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">carb</p>
                        <p className="font-semibold text-blue-700 dark:text-blue-300">
                          {resumoTotal.avgCarbPerMarmita.toFixed(1)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">gord</p>
                        <p className="font-semibold text-blue-700 dark:text-blue-300">
                          {resumoTotal.avgFatPerMarmita.toFixed(1)}g
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEPARADO: por pessoa */}
              {porPessoa.length > 0 && (
                <div>
                  <h2 className="mb-3 font-semibold">
                    Divisão por pessoa (no período)
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {porPessoa.map((p) => (
                      <ResumoPessoa
                        key={p.id}
                        titulo={p.nome}
                        resumo={p.resumo}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
