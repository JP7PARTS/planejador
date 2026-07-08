"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Food } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { getWeekFull, WeekFull } from "@/lib/api/weeks";
import { createFood } from "@/lib/api/foods";
import {
  calculateWeekSummary,
  buildShoppingList,
  WeekItem,
  WeekSummary,
} from "@/lib/calc";
import ResumoPessoa from "../../resumo-pessoa";
import ListaCompras from "../../lista-compras";
import MontagemMarmitas, { PessoaMontagem } from "../../montagem";

type Categoria = Food["category"];

export default function VerSemanaPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [dados, setDados] = useState<WeekFull | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [montando, setMontando] = useState(false);
  // Básicos do próprio leitor (cada um confere a sua despensa).
  const [basicos, setBasicos] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: perfil } = await supabase
          .from("profiles")
          .select("staples")
          .eq("id", user.id)
          .single();
        if (perfil?.staples) setBasicos(perfil.staples as string[]);
      } catch {
        // sem básicos: segue só com os extras da semana
      }
    })();
  }, []);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);
      const data = await getWeekFull(id);
      setDados(data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Monta os resumos a partir dos dados resolvidos no servidor.
  const foodsMap: Record<string, Food> = {};
  (dados?.items || []).forEach((it) => {
    foodsMap[it.food_id] = {
      id: it.food_id,
      name: it.food_name,
      category: it.category as Categoria,
      fc: it.fc,
      kcal_per_100g: it.kcal_per_100g,
      protein_g_per_100g: it.protein_g_per_100g,
      carb_g_per_100g: it.carb_g_per_100g,
      fat_g_per_100g: it.fat_g_per_100g,
    } as Food;
  });

  const isShared = dados?.week.is_shared ?? false;
  const numMarmitas = dados?.week.num_marmitas ?? 1;
  const numMarmitasP2 = dados?.week.num_marmitas_p2 ?? 0;

  const linhas: WeekItem[] = (dados?.items || []).map((it) => ({
    foodId: it.food_id,
    cookedGramsPerMarmita: it.cooked_grams_per_marmita,
    numMarmitas: it.num_marmitas,
    person: it.person === 2 ? 2 : 1,
  }));

  let resumo: WeekSummary | null = null;
  let resumoEu: WeekSummary | null = null;
  let resumoP2: WeekSummary | null = null;
  if (linhas.length > 0) {
    const total = isShared ? numMarmitas + numMarmitasP2 : numMarmitas;
    resumo = calculateWeekSummary(linhas, foodsMap, total);
    if (isShared) {
      resumoEu = calculateWeekSummary(
        linhas.filter((l) => (l.person ?? 1) === 1),
        foodsMap,
        numMarmitas
      );
      resumoP2 = calculateWeekSummary(
        linhas.filter((l) => l.person === 2),
        foodsMap,
        numMarmitasP2
      );
    }
  }

  // Pessoas para a "montagem das marmitas" (nomes reais: dono + parceira).
  const pessoasMontagem: PessoaMontagem[] = isShared
    ? [
        {
          nome: dados?.owner_name || "Você",
          numMarmitas,
          itens: resumoEu?.items ?? [],
        },
        {
          nome: dados?.week.person2_name || "Outra pessoa",
          numMarmitas: numMarmitasP2,
          itens: resumoP2?.items ?? [],
        },
      ]
    : [
        {
          nome: dados?.owner_name || "Você",
          numMarmitas,
          itens: resumo?.items ?? [],
        },
      ];

  // Alimentos que faltam na conta de quem está vendo (sem duplicar por nome).
  const faltantesMap = new Map<
    string,
    WeekFull["items"][number]
  >();
  (dados?.items || []).forEach((it) => {
    if (!it.already_in_my_db && !faltantesMap.has(it.food_name)) {
      faltantesMap.set(it.food_name, it);
    }
  });
  const faltantes = Array.from(faltantesMap.values());

  async function adicionarFaltantes() {
    setAdicionando(true);
    setErro(null);
    setSucesso(null);
    try {
      for (const it of faltantes) {
        await createFood({
          name: it.food_name,
          category: it.category as Categoria,
          kcal_per_100g: it.kcal_per_100g,
          protein_g_per_100g: it.protein_g_per_100g,
          carb_g_per_100g: it.carb_g_per_100g,
          fat_g_per_100g: it.fat_g_per_100g,
          fc: it.fc,
        });
      }
      setSucesso("Alimentos adicionados à sua conta!");
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAdicionando(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {dados?.week.title || "Semana"}
          </h1>
          {dados && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              👥 compartilhada por {dados.owner_name} • somente visualização
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {resumo && (
            <button
              onClick={() => setMontando(true)}
              className="rounded border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              🍱 Montar agora
            </button>
          )}
        </div>
      </header>

      {montando && (
        <MontagemMarmitas
          pessoas={pessoasMontagem}
          onClose={() => setMontando(false)}
        />
      )}

      {erro && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          {sucesso}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando…
        </p>
      ) : !dados ? null : (
        <>
          {/* Alimentos que faltam na minha conta */}
          {faltantes.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
              <h2 className="font-semibold text-amber-900 dark:text-amber-100">
                Alimentos que faltam na sua conta
              </h2>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Estes alimentos estão na semana mas não existem no seu Banco de
                Alimentos:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {faltantes.map((it) => (
                  <span
                    key={it.food_name}
                    className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  >
                    {it.food_name}
                  </span>
                ))}
              </div>
              <button
                onClick={adicionarFaltantes}
                disabled={adicionando}
                className="mt-3 rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {adicionando
                  ? "Adicionando…"
                  : "➕ Adicionar todos à minha conta"}
              </button>
            </div>
          )}

          {resumo && (
            <>
              {/* Lista de Compras (total) */}
              <ListaCompras
                titulo={
                  (dados.week.title || "Semana") + (isShared ? " (Total)" : "")
                }
                itens={buildShoppingList(resumo)}
                complementos={[...basicos, ...(dados.week.extras || [])]}
                storageKey={"ver-" + id}
              />

              {/* Divisão por pessoa (se conjunta) */}
              {isShared && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ResumoPessoa titulo={dados.owner_name} resumo={resumoEu} />
                  <ResumoPessoa
                    titulo={dados.week.person2_name || "Outra pessoa"}
                    resumo={resumoP2}
                  />
                </div>
              )}

              {/* Nutrição (total) */}
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
              </div>
            </>
          )}

          {dados.week.notes && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-medium">Anotações</p>
              <p className="mt-1 text-sm italic text-slate-600 dark:text-slate-300">
                "{dados.week.notes}"
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
