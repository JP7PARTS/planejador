"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Food, WeekItemDB } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  calculateWeekSummary,
  calculateWeekItem,
  WeekItem,
  WeekSummary,
} from "@/lib/calc";
import { getWeek } from "@/lib/api/weeks";
import { getHouseholdSummary } from "@/lib/api/household";
import SemanaSalvaModal from "./semana-salva";
import ResumoPessoa from "./resumo-pessoa";
import Link from "next/link";

export default function SemanaContent() {
  const searchParams = useSearchParams();
  const semanaId = searchParams.get("semanaId");

  const [alimentos, setAlimentos] = useState<Food[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [numMarmitas, setNumMarmitas] = useState(7);
  const [linhas, setLinhas] = useState<WeekItem[]>([]);
  const [notas, setNotas] = useState("");
  const [resumo, setResumo] = useState<WeekSummary | null>(null);
  const [mostrando, setMostrando] = useState<boolean>(false);

  // Semana conjunta (dividida entre você e outra pessoa)
  const [isShared, setIsShared] = useState(false);
  const [person2Name, setPerson2Name] = useState("Namorada");
  const [numMarmitasP2, setNumMarmitasP2] = useState(7);
  const [resumoEu, setResumoEu] = useState<WeekSummary | null>(null);
  const [resumoP2, setResumoP2] = useState<WeekSummary | null>(null);

  // Vínculo do casal (Etapa 8): se vinculado, a 2ª pessoa é a parceira real.
  const [linked, setLinked] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const summary = await getHouseholdSummary();
        const parceira = summary.users.find((u) => u.id !== user.id);
        if (parceira) {
          setLinked(true);
          setPartnerName(parceira.name);
        }
      } catch {
        // Não vinculado (ou compartilhamento inativo): mantém nome livre.
      }
    })();
  }, []);

  // Vinculado: a 2ª pessoa é sempre a parceira (nome automático).
  useEffect(() => {
    if (linked && partnerName) {
      setPerson2Name(partnerName);
    }
  }, [linked, partnerName]);

  const carregarAlimentos = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .order("category")
        .order("name");

      if (error) throw error;
      setAlimentos(data || []);

      // Se houver semanaId, carrega a semana
      if (semanaId) {
        const weekData = await getWeek(semanaId);
        setNumMarmitas(weekData.week.num_marmitas);
        setNotas(weekData.week.notes || "");
        setIsShared(weekData.week.is_shared ?? false);
        setPerson2Name(weekData.week.person2_name || "Namorada");
        setNumMarmitasP2(weekData.week.num_marmitas_p2 || 7);

        const weekItems: WeekItem[] = (weekData.items || []).map(
          (item: WeekItemDB) => ({
            foodId: item.food_id,
            cookedGramsPerMarmita: item.cooked_grams_per_marmita,
            numMarmitas: item.num_marmitas,
            person: item.person === 2 ? 2 : 1,
          })
        );
        setLinhas(weekItems);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, [semanaId]);

  useEffect(() => {
    carregarAlimentos();
  }, [carregarAlimentos]);

  useEffect(() => {
    if (linhas.length === 0) {
      setResumo(null);
      setResumoEu(null);
      setResumoP2(null);
      return;
    }

    const foodsMap: Record<string, Food> = {};
    alimentos.forEach((f) => {
      foodsMap[f.id] = f;
    });

    const totalMarmitas = isShared ? numMarmitas + numMarmitasP2 : numMarmitas;
    setResumo(calculateWeekSummary(linhas, foodsMap, totalMarmitas));

    if (isShared) {
      const linhasEu = linhas.filter((l) => (l.person ?? 1) === 1);
      const linhasP2 = linhas.filter((l) => l.person === 2);
      setResumoEu(calculateWeekSummary(linhasEu, foodsMap, numMarmitas));
      setResumoP2(calculateWeekSummary(linhasP2, foodsMap, numMarmitasP2));
    } else {
      setResumoEu(null);
      setResumoP2(null);
    }
  }, [linhas, numMarmitas, numMarmitasP2, isShared, alimentos]);

  function adicionarLinha() {
    const novaLinha: WeekItem = {
      foodId: "",
      cookedGramsPerMarmita: 100,
      numMarmitas: numMarmitas,
      person: 1,
    };
    setLinhas([...linhas, novaLinha]);
  }

  function removerLinha(index: number) {
    setLinhas(linhas.filter((_, i) => i !== index));
  }

  function atualizarLinha(index: number, updates: Partial<WeekItem>) {
    const novasLinhas = [...linhas];
    novasLinhas[index] = { ...novasLinhas[index], ...updates };
    setLinhas(novasLinhas);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Montar a Semana</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Defina a quantidade de marmitas e os alimentos que você preparará
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/inicio"
            className="rounded bg-slate-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            ← Voltar
          </Link>
          <Link
            href="/inicio/semanas"
            className="rounded bg-slate-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            title="Ver minhas semanas salvas"
          >
            📚
          </Link>
        </div>
      </header>

      {erro && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando alimentos…
        </p>
      ) : (
        <>
          {/* Toggle: semana conjunta */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium">
                👥 Semana conjunta (dividir com outra pessoa)
              </span>
            </label>

            {isShared &&
              (linked && partnerName ? (
                <div className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                  🔗 Compartilhando com <strong>{partnerName}</strong> — esta
                  semana também aparecerá na conta dela.
                </div>
              ) : (
                <div className="mt-3">
                  <label className="block text-xs font-medium">
                    Nome da outra pessoa
                  </label>
                  <input
                    type="text"
                    value={person2Name}
                    onChange={(e) => setPerson2Name(e.target.value)}
                    placeholder="Ex.: Namorada"
                    className="mt-1 w-full max-w-xs rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Dica: para a semana aparecer na conta dela, vinculem as contas
                    em Configurações.
                  </p>
                </div>
              ))}
          </div>

          {/* Input: número de marmitas */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            {isShared ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Suas marmitas (Eu)
                  </label>
                  <input
                    type="number"
                    value={numMarmitas}
                    onChange={(e) =>
                      setNumMarmitas(Math.max(1, Number(e.target.value)))
                    }
                    min="1"
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Marmitas de {person2Name || "outra pessoa"}
                  </label>
                  <input
                    type="number"
                    value={numMarmitasP2}
                    onChange={(e) =>
                      setNumMarmitasP2(Math.max(1, Number(e.target.value)))
                    }
                    min="1"
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            ) : (
              <>
                <label className="block text-sm font-medium">
                  Quantas marmitas você fará?
                </label>
                <input
                  type="number"
                  value={numMarmitas}
                  onChange={(e) =>
                    setNumMarmitas(Math.max(1, Number(e.target.value)))
                  }
                  min="1"
                  className="mt-2 w-full max-w-xs rounded border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                />
              </>
            )}
          </div>

          {/* Tabela de linhas de alimentos */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Alimentos da Semana</h2>
              <button
                onClick={adicionarLinha}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                + Adicionar
              </button>
            </div>

            {linhas.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400">
                Nenhum alimento adicionado. Clique em "+ Adicionar" para começar.
              </p>
            ) : (
              <div className="space-y-3">
                {linhas.map((linha, idx) => {
                  const food = alimentos.find((f) => f.id === linha.foodId);
                  const resultado =
                    food && linha.foodId
                      ? calculateWeekItem(
                          food,
                          linha.cookedGramsPerMarmita,
                          linha.numMarmitas
                        )
                      : null;

                  return (
                    <div
                      key={idx}
                      className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div
                        className={
                          "grid grid-cols-1 gap-3 sm:items-end " +
                          (isShared ? "sm:grid-cols-5" : "sm:grid-cols-4")
                        }
                      >
                        <div>
                          <label className="block text-xs font-medium">
                            Alimento
                          </label>
                          <select
                            value={linha.foodId}
                            onChange={(e) =>
                              atualizarLinha(idx, { foodId: e.target.value })
                            }
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <option value="">Selecionar...</option>
                            {alimentos.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium">
                            g cozido/marmita
                          </label>
                          <input
                            type="number"
                            value={linha.cookedGramsPerMarmita}
                            onChange={(e) =>
                              atualizarLinha(idx, {
                                cookedGramsPerMarmita: Number(e.target.value),
                              })
                            }
                            min="0"
                            step="1"
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium">
                            nº marmitas
                          </label>
                          <input
                            type="number"
                            value={linha.numMarmitas}
                            onChange={(e) =>
                              atualizarLinha(idx, {
                                numMarmitas: Number(e.target.value),
                              })
                            }
                            min="1"
                            step="1"
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </div>

                        {isShared && (
                          <div>
                            <label className="block text-xs font-medium">
                              Pessoa
                            </label>
                            <select
                              value={linha.person ?? 1}
                              onChange={(e) =>
                                atualizarLinha(idx, {
                                  person: Number(e.target.value) === 2 ? 2 : 1,
                                })
                              }
                              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <option value={1}>Eu</option>
                              <option value={2}>{person2Name || "Outra"}</option>
                            </select>
                          </div>
                        )}

                        <button
                          onClick={() => removerLinha(idx)}
                          className="rounded px-2 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          Remover
                        </button>
                      </div>

                      {resultado && (
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-300 pt-2 text-xs dark:border-slate-700 sm:grid-cols-4">
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">
                              CRU total
                            </p>
                            <p className="font-semibold">
                              {resultado.rawTotal.toFixed(0)}g
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">
                              kcal total
                            </p>
                            <p className="font-semibold">
                              {resultado.kcalTotal.toFixed(0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">
                              prot total
                            </p>
                            <p className="font-semibold">
                              {resultado.proteinTotal.toFixed(1)}g
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">
                              carb total
                            </p>
                            <p className="font-semibold">
                              {resultado.carbTotal.toFixed(1)}g
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resultados: lista de compras e nutrição */}
          {resumo && (
            <>
              {/* Lista de Preparo/Compras (total) */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
                <h2 className="mb-3 text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  Lista de Preparo/Compras{isShared ? " — Total" : ""}
                </h2>
                <div className="space-y-2 text-sm">
                  {Object.entries(resumo.totalRawPerFood).map(
                    ([foodName, grams]) => (
                      <div
                        key={foodName}
                        className="flex items-center justify-between"
                      >
                        <span className="text-slate-700 dark:text-slate-300">
                          {foodName}
                        </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {grams.toFixed(0)}g (CRU)
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Divisão por pessoa (só na semana conjunta) */}
              {isShared && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ResumoPessoa titulo="Você (Eu)" resumo={resumoEu} />
                  <ResumoPessoa
                    titulo={person2Name || "Outra pessoa"}
                    resumo={resumoP2}
                  />
                </div>
              )}

              {/* Nutrição da Semana (total) */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
                <h2 className="mb-3 text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Nutrição da Semana{isShared ? " — Total" : ""}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Total kcal
                    </p>
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
                    <p className="text-slate-600 dark:text-slate-400">
                      Total carbs
                    </p>
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
                    Média por marmita
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">kcal</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        {resumo.avgKcalPerMarmita.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">prot</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        {resumo.avgProteinPerMarmita.toFixed(1)}g
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">carb</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        {resumo.avgCarbPerMarmita.toFixed(1)}g
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">gord</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        {resumo.avgFatPerMarmita.toFixed(1)}g
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notas de temperos */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <label className="block text-sm font-medium">
              Anotações (temperos, dicas, etc.)
            </label>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Temperos e aditivos não entram no cálculo de nutrição no MVP.
            </p>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ex.: sal, alho, azeite..."
              className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
              rows={3}
            />
          </div>

          {/* Botão Salvar Semana */}
          {linhas.length > 0 && (
            <button
              onClick={() => setMostrando(true)}
              className="rounded bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
            >
              💾 Salvar Semana
            </button>
          )}

          {mostrando && (
            <SemanaSalvaModal
              linhas={linhas}
              numMarmitas={numMarmitas}
              notas={notas}
              isShared={isShared}
              person2Name={person2Name}
              numMarmitasP2={numMarmitasP2}
              onClose={() => setMostrando(false)}
              onSuccess={() => {
                setMostrando(false);
                // Limpa o formulário após salvar com sucesso
                setLinhas([]);
                setNotas("");
                setNumMarmitas(7);
                setIsShared(false);
                setPerson2Name("Namorada");
                setNumMarmitasP2(7);
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
