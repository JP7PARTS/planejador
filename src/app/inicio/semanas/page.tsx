"use client";

import { useCallback, useEffect, useState } from "react";
import { Food, Week, WeekItemDB } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  listWeeks,
  toggleFavorite,
  deleteWeek,
  getWeek,
  duplicateWeek,
} from "@/lib/api/weeks";
import { calculateWeekSummary } from "@/lib/calc";
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

  const carregarDados = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);

      const supabase = createClient();
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
  onToggleFavorite: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  deletando: boolean;
}

function SemanaCard({
  week,
  resumo,
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
          href={`/inicio/semana?semanaId=${week.id}`}
          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {week.title}
        </Link>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {dataFormatada} • {week.num_marmitas} marmitas
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
        <button
          onClick={onToggleFavorite}
          className="rounded px-2 py-1 text-sm font-medium text-yellow-600 transition hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-950"
          title={week.is_favorite ? "Remover de favoritos" : "Adicionar aos favoritos"}
        >
          {week.is_favorite ? "⭐" : "☆"}
        </button>
        <button
          onClick={onDuplicate}
          className="rounded px-2 py-1 text-sm font-medium text-blue-600 transition hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-950"
          title="Duplicar"
        >
          📋
        </button>
        <button
          onClick={onDelete}
          disabled={deletando}
          className="rounded px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
          title="Deletar"
        >
          {deletando ? "…" : "🗑️"}
        </button>
      </div>
    </div>
  );
}
