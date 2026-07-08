"use client";

import { useCallback, useEffect, useState } from "react";
import { Food, Week, WeekItemDB } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  listWeeks,
  toggleFavorite,
  deleteWeek,
  duplicateWeek,
  getWeekFull,
} from "@/lib/api/weeks";
import { calculateWeekSummary } from "@/lib/calc";
import { getHouseholdSummary } from "@/lib/api/household";
import Link from "next/link";

export default function SemanasPage() {
  const [semanas, setSemanas] = useState<Week[]>([]);
  const [alimentos, setAlimentos] = useState<Food[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [resumos, setResumos] = useState<
    Record<string, { totalKcal: number; totalProtein: number }>
  >({});
  const [meuId, setMeuId] = useState<string | null>(null);
  const [nomesPorId, setNomesPorId] = useState<Record<string, string>>({});

  const carregarDados = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);

      const supabase = createClient();

      // Quem sou eu (para separar minhas semanas das da parceira).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setMeuId(uid);

      // Se vinculado, monta o mapa id→nome dos membros do casal (para os selos).
      try {
        const summary = await getHouseholdSummary();
        const mapa: Record<string, string> = {};
        summary.members.forEach((u) => {
          mapa[u.id] = u.name;
        });
        setNomesPorId(mapa);
      } catch {
        setNomesPorId({});
      }

      const { data: foods, error: foodsError } = await supabase
        .from("foods")
        .select("*");

      if (foodsError) throw foodsError;
      setAlimentos(foods || []);

      const weeks = await listWeeks();
      setSemanas(weeks);

      // Calcula resumos de cada semana
      const resumosMap: Record<string, { totalKcal: number; totalProtein: number }> = {};
      for (const week of weeks) {
        if (uid && week.user_id !== uid) {
          // Semana da parceira: os alimentos são da conta dela, então resolve
          // no servidor (RPC) em vez de usar o meu banco de alimentos.
          try {
            const full = await getWeekFull(week.id);
            const foodsMap: Record<string, Food> = {};
            full.items.forEach((it) => {
              foodsMap[it.food_id] = {
                id: it.food_id,
                name: it.food_name,
                fc: it.fc,
                kcal_per_100g: it.kcal_per_100g,
                protein_g_per_100g: it.protein_g_per_100g,
                carb_g_per_100g: it.carb_g_per_100g,
                fat_g_per_100g: it.fat_g_per_100g,
              } as Food;
            });
            const weekItems = full.items.map((it) => ({
              foodId: it.food_id,
              cookedGramsPerMarmita: it.cooked_grams_per_marmita,
              numMarmitas: it.num_marmitas,
            }));
            const summary = calculateWeekSummary(
              weekItems,
              foodsMap,
              week.num_marmitas
            );
            resumosMap[week.id] = {
              totalKcal: summary.totalKcal,
              totalProtein: summary.totalProtein,
            };
          } catch {
            // ignora resumo desta semana se falhar
          }
          continue;
        }

        const { data: items } = await supabase
          .from("week_items")
          .select("*")
          .eq("week_id", week.id);

        if (items && items.length > 0 && foods) {
          const foodsMap: Record<string, Food> = {};
          foods.forEach((f) => {
            foodsMap[f.id] = f;
          });

          const weekItems = items.map((item: WeekItemDB) => ({
            foodId: item.food_id,
            cookedGramsPerMarmita: item.cooked_grams_per_marmita,
            numMarmitas: item.num_marmitas,
          }));

          const summary = calculateWeekSummary(
            weekItems,
            foodsMap,
            week.num_marmitas
          );
          resumosMap[week.id] = {
            totalKcal: summary.totalKcal,
            totalProtein: summary.totalProtein,
          };
        }
      }
      setResumos(resumosMap);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  async function handleToggleFavorite(week: Week) {
    try {
      await toggleFavorite(week.id);
      setSemanas(
        semanas.map((s) =>
          s.id === week.id ? { ...s, is_favorite: !s.is_favorite } : s
        )
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao favoritar");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que quer deletar esta semana?")) {
      return;
    }

    setDeletandoId(id);
    try {
      await deleteWeek(id);
      setSemanas(semanas.filter((s) => s.id !== id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao deletar");
      setDeletandoId(null);
    }
  }

  async function handleDuplicate(week: Week) {
    const newTitle = `${week.title} - cópia`;
    try {
      const duplicated = await duplicateWeek(week.id, newTitle);
      setSemanas([duplicated, ...semanas]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao duplicar");
    }
  }

  const favoritas = semanas.filter((s) => s.is_favorite);
  const normais = semanas.filter((s) => !s.is_favorite);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Minhas Semanas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {semanas.length} semana{semanas.length !== 1 ? "s" : ""} salva
            {semanas.length !== 1 ? "s" : ""}
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
          Carregando semanas…
        </p>
      ) : semanas.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-600 dark:text-slate-300">
            Nenhuma semana salva ainda.
          </p>
          <Link
            href="/inicio/semana"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Montar a primeira semana →
          </Link>
        </div>
      ) : (
        <>
          {favoritas.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">⭐ Favoritas</h2>
              <div className="space-y-2">
                {favoritas.map((week) => (
                  <SemanaCard
                    key={week.id}
                    week={week}
                    resumo={resumos[week.id]}
                    daParceira={!!meuId && week.user_id !== meuId}
                    nomeDono={nomesPorId[week.user_id]}
                    onToggleFavorite={() => handleToggleFavorite(week)}
                    onDelete={() => handleDelete(week.id)}
                    onDuplicate={() => handleDuplicate(week)}
                    deletando={deletandoId === week.id}
                  />
                ))}
              </div>
            </section>
          )}

          {normais.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Semanas</h2>
              <div className="space-y-2">
                {normais.map((week) => (
                  <SemanaCard
                    key={week.id}
                    week={week}
                    resumo={resumos[week.id]}
                    daParceira={!!meuId && week.user_id !== meuId}
                    nomeDono={nomesPorId[week.user_id]}
                    onToggleFavorite={() => handleToggleFavorite(week)}
                    onDelete={() => handleDelete(week.id)}
                    onDuplicate={() => handleDuplicate(week)}
                    deletando={deletandoId === week.id}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

interface SemanaCardProps {
  week: Week;
  resumo?: { totalKcal: number; totalProtein: number };
  daParceira: boolean;
  nomeDono?: string;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  deletando: boolean;
}

function SemanaCard({
  week,
  resumo,
  daParceira,
  nomeDono,
  onToggleFavorite,
  onDelete,
  onDuplicate,
  deletando,
}: SemanaCardProps) {
  const dataFormatada = new Date(week.created_at).toLocaleDateString("pt-BR");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <Link
          href={
            daParceira
              ? `/inicio/semana/ver/${week.id}`
              : `/inicio/semana?semanaId=${week.id}`
          }
          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {week.title}
        </Link>
        {week.is_shared && (
          <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-200">
            {daParceira
              ? `👥 compartilhada por ${nomeDono || "parceira"}`
              : week.person2_name
                ? `👥 com ${week.person2_name}`
                : "👥 conjunta"}
          </span>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {dataFormatada} •{" "}
          {week.is_shared
            ? `${week.num_marmitas} + ${week.num_marmitas_p2} marmitas`
            : `${week.num_marmitas} marmitas`}
        </p>
        {resumo && (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {resumo.totalKcal.toFixed(0)} kcal • {resumo.totalProtein.toFixed(1)}g prot
          </p>
        )}
        {week.notes && (
          <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
            "{week.notes}"
          </p>
        )}
      </div>

      <div className="flex gap-1">
        {/* Favoritar e apagar só para o dono; a parceira só visualiza/duplica. */}
        {!daParceira && (
          <button
            onClick={onToggleFavorite}
            className="rounded px-2 py-1 text-sm font-medium text-yellow-600 transition hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-950"
            title={week.is_favorite ? "Remover de favoritos" : "Adicionar aos favoritos"}
          >
            {week.is_favorite ? "⭐" : "☆"}
          </button>
        )}
        <button
          onClick={onDuplicate}
          className="rounded px-2 py-1 text-sm font-medium text-blue-600 transition hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-950"
          title="Duplicar"
        >
          📋
        </button>
        {!daParceira && (
          <button
            onClick={onDelete}
            disabled={deletando}
            className="rounded px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
            title="Deletar"
          >
            {deletando ? "…" : "🗑️"}
          </button>
        )}
      </div>
    </div>
  );
}
