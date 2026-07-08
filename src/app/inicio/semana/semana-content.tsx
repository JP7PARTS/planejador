"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Food, WeekItemDB } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  calculateWeekSummary,
  calculateWeekItem,
  buildShoppingList,
  WeekItem,
  WeekItemResult,
  WeekSummary,
} from "@/lib/calc";
import { getWeek } from "@/lib/api/weeks";
import { getHouseholdSummary } from "@/lib/api/household";
import SemanaSalvaModal from "./semana-salva";
import ResumoPessoa from "./resumo-pessoa";
import ListaCompras from "./lista-compras";
import AlimentoSelect from "./alimento-select";
import MontagemMarmitas, { PessoaMontagem } from "./montagem";
import Link from "next/link";

// Uma linha da UI = um alimento com os dados das duas pessoas (na semana
// conjunta). No modo normal, só a pessoa 1 é usada. A lista plana de WeekItem
// (que calc/save/modal consomem) é derivada destas linhas.
interface FoodRow {
  foodId: string;
  p1On: boolean;
  p1Grams: number;
  p1Marmitas: number;
  p2On: boolean;
  p2Grams: number;
  p2Marmitas: number;
}

export default function SemanaContent() {
  const searchParams = useSearchParams();
  const semanaId = searchParams.get("semanaId");

  const [alimentos, setAlimentos] = useState<Food[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [numMarmitas, setNumMarmitas] = useState(7);
  const [rows, setRows] = useState<FoodRow[]>([]);
  const [notas, setNotas] = useState("");
  const [tituloSemana, setTituloSemana] = useState("");
  const [resumo, setResumo] = useState<WeekSummary | null>(null);
  const [mostrando, setMostrando] = useState<boolean>(false);
  const [montando, setMontando] = useState<boolean>(false);

  // Nome de quem está montando (pessoa 1) — usado nos rótulos no lugar de "Eu".
  const [meuNome, setMeuNome] = useState("Eu");

  // Complementos (temperos & básicos): base pessoal + extras desta semana.
  const [basicos, setBasicos] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [novoExtra, setNovoExtra] = useState("");

  // Semana conjunta (dividida entre você e outra pessoa)
  const [isShared, setIsShared] = useState(false);
  const [person2Name, setPerson2Name] = useState("Namorada");
  const [numMarmitasP2, setNumMarmitasP2] = useState(7);
  const [resumoEu, setResumoEu] = useState<WeekSummary | null>(null);
  const [resumoP2, setResumoP2] = useState<WeekSummary | null>(null);

  // Lista plana de itens (1 ou 2 por alimento), derivada das linhas. É o que a
  // calc, o modal de salvar e o save consomem — sem mudança neles.
  const linhas: WeekItem[] = useMemo(() => {
    const itens: WeekItem[] = [];
    rows.forEach((r) => {
      if (!r.foodId) return;
      if (r.p1On && r.p1Grams > 0) {
        itens.push({
          foodId: r.foodId,
          cookedGramsPerMarmita: r.p1Grams,
          numMarmitas: r.p1Marmitas,
          person: 1,
        });
      }
      if (isShared && r.p2On && r.p2Grams > 0) {
        itens.push({
          foodId: r.foodId,
          cookedGramsPerMarmita: r.p2Grams,
          numMarmitas: r.p2Marmitas,
          person: 2,
        });
      }
    });
    return itens;
  }, [rows, isShared]);

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

        // Nome de quem está montando (mesmo padrão da página inicial).
        const nome =
          (user.user_metadata?.display_name as string | undefined)?.trim() ||
          user.email?.split("@")[0] ||
          "Eu";
        setMeuNome(nome);

        // Lista pessoal de básicos (temperos que aparecem em toda semana).
        const { data: perfil } = await supabase
          .from("profiles")
          .select("staples")
          .eq("id", user.id)
          .single();
        if (perfil?.staples) setBasicos(perfil.staples as string[]);

        const summary = await getHouseholdSummary();
        const parceira = summary.members.find((u) => u.id !== user.id);
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
        setTituloSemana(weekData.week.title || "");
        setNumMarmitas(weekData.week.num_marmitas);
        setNotas(weekData.week.notes || "");
        setIsShared(weekData.week.is_shared ?? false);
        setPerson2Name(weekData.week.person2_name || "Namorada");
        setNumMarmitasP2(weekData.week.num_marmitas_p2 || 7);
        setExtras(weekData.week.extras || []);

        // Agrupa os itens por alimento: pessoa 1 preenche p1*, pessoa 2 p2*.
        // Itens extras do mesmo alimento/pessoa (raro) viram novas linhas.
        const porAlimento: FoodRow[] = [];
        (weekData.items || []).forEach((item: WeekItemDB) => {
          const pessoa = item.person === 2 ? 2 : 1;
          const grams = item.cooked_grams_per_marmita;
          const marms = item.num_marmitas;
          const existente = porAlimento.find(
            (r) =>
              r.foodId === item.food_id &&
              (pessoa === 1 ? !r.p1On : !r.p2On)
          );
          const alvo = existente ?? {
            foodId: item.food_id,
            p1On: false,
            p1Grams: 100,
            p1Marmitas: weekData.week.num_marmitas || 7,
            p2On: false,
            p2Grams: 100,
            p2Marmitas: weekData.week.num_marmitas_p2 || 7,
          };
          if (pessoa === 1) {
            alvo.p1On = true;
            alvo.p1Grams = grams;
            alvo.p1Marmitas = marms;
          } else {
            alvo.p2On = true;
            alvo.p2Grams = grams;
            alvo.p2Marmitas = marms;
          }
          if (!existente) porAlimento.push(alvo);
        });
        setRows(porAlimento);
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
    const novaLinha: FoodRow = {
      foodId: "",
      p1On: true,
      p1Grams: 100,
      p1Marmitas: numMarmitas,
      // No conjunto, a 2ª pessoa já aparece ligada por padrão.
      p2On: isShared,
      p2Grams: 100,
      p2Marmitas: numMarmitasP2,
    };
    setRows([...rows, novaLinha]);
  }

  function removerLinha(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  function atualizarLinha(index: number, updates: Partial<FoodRow>) {
    const novasLinhas = [...rows];
    novasLinhas[index] = { ...novasLinhas[index], ...updates };
    setRows(novasLinhas);
  }

  function adicionarExtra() {
    const v = novoExtra.trim();
    if (!v) return;
    const jaExiste = extras.some(
      (e) => e.trim().toLowerCase() === v.toLowerCase()
    );
    if (!jaExiste) setExtras([...extras, v]);
    setNovoExtra("");
  }

  function removerExtra(index: number) {
    setExtras(extras.filter((_, i) => i !== index));
  }

  // Complementos que aparecem na lista de compras = base pessoal + extras.
  const complementos = [...basicos, ...extras];

  // Pessoas para a "montagem das marmitas": conjunta = duas pessoas (cada uma
  // com seus itens/marmitas); normal = só quem monta. Reusa os resumos já
  // calculados (WeekItemResult tem gramas cozidas/marmita e nº de marmitas).
  const pessoasMontagem: PessoaMontagem[] = isShared
    ? [
        {
          nome: meuNome,
          numMarmitas,
          itens: resumoEu?.items ?? [],
        },
        {
          nome: person2Name || "Outra pessoa",
          numMarmitas: numMarmitasP2,
          itens: resumoP2?.items ?? [],
        },
      ]
    : [
        {
          nome: meuNome,
          numMarmitas,
          itens: resumo?.items ?? [],
        },
      ];

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
                    Marmitas de {meuNome}
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

            {rows.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400">
                Nenhum alimento adicionado. Clique em "+ Adicionar" para começar.
              </p>
            ) : (
              <div className="space-y-3">
                {rows.map((linha, idx) => {
                  const food = alimentos.find((f) => f.id === linha.foodId);
                  const resP1 =
                    food && linha.p1On && linha.p1Grams > 0
                      ? calculateWeekItem(food, linha.p1Grams, linha.p1Marmitas)
                      : null;
                  const resP2 =
                    food && isShared && linha.p2On && linha.p2Grams > 0
                      ? calculateWeekItem(food, linha.p2Grams, linha.p2Marmitas)
                      : null;

                  // Campos [g cozido/marmita] + [nº marmitas] de uma pessoa.
                  const campos = (
                    on: boolean,
                    grams: number,
                    marmitas: number,
                    setGrams: (v: number) => void,
                    setMarmitas: (v: number) => void
                  ) => (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium">
                          g cozido/marmita
                        </label>
                        <input
                          type="number"
                          value={grams}
                          disabled={!on}
                          onChange={(e) => setGrams(Number(e.target.value))}
                          min="0"
                          step="1"
                          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium">
                          nº marmitas
                        </label>
                        <input
                          type="number"
                          value={marmitas}
                          disabled={!on}
                          onChange={(e) => setMarmitas(Number(e.target.value))}
                          min="1"
                          step="1"
                          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  );

                  // Mini-resultado (cru + kcal + prot) de uma pessoa.
                  const mini = (label: string, r: WeekItemResult | null) =>
                    r ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {label}:{" "}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {r.rawTotal.toFixed(0)}g cru
                        </span>{" "}
                        • {r.kcalTotal.toFixed(0)} kcal •{" "}
                        {r.proteinTotal.toFixed(1)}g prot
                      </p>
                    ) : null;

                  return (
                    <div
                      key={idx}
                      className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      {/* Alimento (busca) + botão remover no topo */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium">
                            Alimento
                          </label>
                          <div className="mt-1">
                            <AlimentoSelect
                              alimentos={alimentos}
                              value={linha.foodId}
                              onChange={(foodId) =>
                                atualizarLinha(idx, { foodId })
                              }
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removerLinha(idx)}
                          title="Remover alimento"
                          aria-label="Remover alimento"
                          className="mt-5 shrink-0 rounded px-2 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          🗑️
                        </button>
                      </div>

                      {!isShared ? (
                        <>
                          {campos(
                            true,
                            linha.p1Grams,
                            linha.p1Marmitas,
                            (v) => atualizarLinha(idx, { p1Grams: v }),
                            (v) => atualizarLinha(idx, { p1Marmitas: v })
                          )}
                          {food &&
                            mini(
                              "Total",
                              resP1
                            )}
                        </>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {/* Pessoa 1 (quem monta) */}
                          <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                            <label className="flex items-center gap-2 text-xs font-semibold">
                              <input
                                type="checkbox"
                                checked={linha.p1On}
                                onChange={(e) =>
                                  atualizarLinha(idx, { p1On: e.target.checked })
                                }
                                className="size-4 accent-emerald-600"
                              />
                              {meuNome}
                            </label>
                            <div className="mt-2">
                              {campos(
                                linha.p1On,
                                linha.p1Grams,
                                linha.p1Marmitas,
                                (v) => atualizarLinha(idx, { p1Grams: v }),
                                (v) => atualizarLinha(idx, { p1Marmitas: v })
                              )}
                            </div>
                            {food && linha.p1On && mini("Compra", resP1)}
                          </div>

                          {/* Pessoa 2 (parceira) */}
                          <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                            <label className="flex items-center gap-2 text-xs font-semibold">
                              <input
                                type="checkbox"
                                checked={linha.p2On}
                                onChange={(e) =>
                                  atualizarLinha(idx, { p2On: e.target.checked })
                                }
                                className="size-4 accent-emerald-600"
                              />
                              {person2Name || "Outra pessoa"}
                            </label>
                            <div className="mt-2">
                              {campos(
                                linha.p2On,
                                linha.p2Grams,
                                linha.p2Marmitas,
                                (v) => atualizarLinha(idx, { p2Grams: v }),
                                (v) => atualizarLinha(idx, { p2Marmitas: v })
                              )}
                            </div>
                            {food && linha.p2On && mini("Compra", resP2)}
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
              <ListaCompras
                titulo={
                  (tituloSemana || "Minha semana") + (isShared ? " (Total)" : "")
                }
                itens={buildShoppingList(resumo)}
                complementos={complementos}
                storageKey={semanaId ?? "nova"}
              />

              {/* Divisão por pessoa (só na semana conjunta) */}
              {isShared && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ResumoPessoa titulo={meuNome} resumo={resumoEu} />
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

          {/* Complementos (temperos & básicos) */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">
              🧂 Complementos (temperos & básicos)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Itens pra conferir na despensa (não entram no cálculo). Aparecem na
              lista de compras com checkbox.
            </p>

            {/* Base pessoal (aparece em toda semana) */}
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Seus básicos (todas as semanas)
                </p>
                <Link
                  href="/inicio/configuracoes"
                  className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  editar em Configurações
                </Link>
              </div>
              {basicos.length === 0 ? (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Nenhum básico cadastrado ainda. Cadastre sal, alho, azeite… em
                  Configurações.
                </p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {basicos.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Extras só desta semana */}
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Extras desta semana
              </p>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={novoExtra}
                  onChange={(e) => setNovoExtra(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarExtra();
                    }
                  }}
                  placeholder="Ex.: coentro, pimenta…"
                  className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={adicionarExtra}
                  className="shrink-0 rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  + Adicionar
                </button>
              </div>
              {extras.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {extras.map((ex, i) => (
                    <span
                      key={ex}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    >
                      {ex}
                      <button
                        type="button"
                        onClick={() => removerExtra(i)}
                        aria-label={"Remover " + ex}
                        className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

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

          {/* Ações: montar agora + salvar */}
          {linhas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMontando(true)}
                className="rounded border border-emerald-600 px-4 py-2 font-medium text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                🍱 Montar agora
              </button>
              <button
                onClick={() => setMostrando(true)}
                className="rounded bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
              >
                💾 Salvar Semana
              </button>
            </div>
          )}

          {montando && (
            <MontagemMarmitas
              pessoas={pessoasMontagem}
              onClose={() => setMontando(false)}
            />
          )}

          {mostrando && (
            <SemanaSalvaModal
              semanaId={semanaId}
              tituloInicial={tituloSemana}
              linhas={linhas}
              numMarmitas={numMarmitas}
              notas={notas}
              extras={extras}
              isShared={isShared}
              person2Name={person2Name}
              numMarmitasP2={numMarmitasP2}
              onClose={() => setMostrando(false)}
              onSuccess={() => {
                setMostrando(false);
                // Limpa o formulário após salvar com sucesso
                setRows([]);
                setNotas("");
                setExtras([]);
                setTituloSemana("");
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
