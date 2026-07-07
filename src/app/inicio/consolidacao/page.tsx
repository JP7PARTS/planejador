"use client";

import { useCallback, useEffect, useState } from "react";
import { getHouseholdSummary } from "@/lib/api/household";
import Link from "next/link";

interface HouseholdSummary {
  totalKcal: number;
  totalProtein: number;
  totalCarb: number;
  totalFat: number;
  totalRawPerFood: Record<string, number>;
  numMarmitas: number;
  users: Array<{ id: string; name: string }>;
}

export default function ConsolidacaoPage() {
  const [resumo, setResumo] = useState<HouseholdSummary | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarResumo = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);

      const data = await getHouseholdSummary();
      setResumo(data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Totais do Casal</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consolidação de dados de ambos os parceiros
          </p>
        </div>
        <Link
          href="/inicio"
          className="rounded bg-slate-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          ← Voltar
        </Link>
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
      ) : resumo ? (
        <>
          {/* Membros do Casal */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold">Membros do Casal</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {resumo.users.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                >
                  👤 {user.name}
                </span>
              ))}
            </div>
          </div>

          {/* Lista de Compras Combinada */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
            <h2 className="mb-3 text-lg font-semibold text-emerald-900 dark:text-emerald-100">
              📦 Lista de Preparo/Compras Combinada
            </h2>
            {Object.entries(resumo.totalRawPerFood).length === 0 ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Nenhum alimento nas semanas do casal
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(resumo.totalRawPerFood)
                  .sort(([, a], [, b]) => b - a)
                  .map(([foodName, grams]) => (
                    <div
                      key={foodName}
                      className="flex items-center justify-between border-t border-emerald-200 pt-2 dark:border-emerald-800 first:border-t-0 first:pt-0"
                    >
                      <span className="text-slate-700 dark:text-slate-300">
                        {foodName}
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {grams.toFixed(0)}g (CRU)
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Nutrição Semanal Combinada */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
            <h2 className="mb-3 text-lg font-semibold text-blue-900 dark:text-blue-100">
              🥗 Nutrição Semanal Combinada
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-slate-600 dark:text-slate-400">Total kcal</p>
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                  {resumo.totalKcal.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">
                  Total proteína
                </p>
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                  {resumo.totalProtein.toFixed(1)}g
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Total carbs</p>
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                  {resumo.totalCarb.toFixed(1)}g
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">
                  Total gordura
                </p>
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                  {resumo.totalFat.toFixed(1)}g
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-blue-200 pt-4 dark:border-blue-900">
              <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                Média por marmita do casal ({resumo.numMarmitas} no total)
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-slate-600 dark:text-slate-400">kcal</p>
                  <p className="font-semibold text-blue-700 dark:text-blue-300">
                    {(resumo.totalKcal / (resumo.numMarmitas || 1)).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">prot</p>
                  <p className="font-semibold text-blue-700 dark:text-blue-300">
                    {(resumo.totalProtein / (resumo.numMarmitas || 1)).toFixed(1)}g
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">carb</p>
                  <p className="font-semibold text-blue-700 dark:text-blue-300">
                    {(resumo.totalCarb / (resumo.numMarmitas || 1)).toFixed(1)}g
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">gord</p>
                  <p className="font-semibold text-blue-700 dark:text-blue-300">
                    {(resumo.totalFat / (resumo.numMarmitas || 1)).toFixed(1)}g
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
