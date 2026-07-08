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
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8 sm:py-10">
      <div>
        <h1 className="text-[clamp(26px,4vw,34px)] font-bold tracking-tight">
          Minhas semanas
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">
          {semanas.length} cardápio{semanas.length !== 1 ? "s" : ""} salvo
          {semanas.length !== 1 ? "s" : ""}
        </p>
      </div>

      {erro && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando semanas…
        </p>
      ) : semanas.length === 0 ? (
        <div className="rounded-[18px] border border-[#EADFCD] bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-600 dark:text-slate-300">
            Nenhuma semana salva ainda.
          </p>
          <Link
            href="/inicio/semana"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Montar a primeira semana →
          </Link>
        </div>
      ) : (
        <>
          {favoritas.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-base font-bold text-rose-600 dark:text-rose-400">
                ⭐ Favoritas
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
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
              <h2 className="mb-2.5 text-base font-bold">Todas</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
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
  const href = daParceira
    ? `/inicio/semana/ver/${week.id}`
    : `/inicio/semana?semanaId=${week.id}`;

  const marmitasTxt = week.is_shared
    ? `${week.num_marmitas} + ${week.num_marmitas_p2} marmitas`
    : `${week.num_marmitas} marmitas`;

  const meta = resumo
    ? `${marmitasTxt} · ${resumo.totalKcal.toFixed(0)} kcal · ${resumo.totalProtein.toFixed(0)} g prot`
    : marmitasTxt;

  return (
    <div className="rounded-[18px] border border-[#EADFCD] bg-white p-[18px] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2.5">
        <Link
          href={href}
          className="text-[17px] font-bold text-emerald-700 hover:underline dark:text-emerald-400 [font-family:var(--font-display)]"
        >
          {week.title}
        </Link>
        {!daParceira && (
          <button
            onClick={onToggleFavorite}
            className="text-[17px] leading-none transition hover:scale-110"
            title={
              week.is_favorite
                ? "Remover de favoritos"
                : "Adicionar aos favoritos"
            }
          >
            <span className={week.is_favorite ? "" : "text-[#D6CDBB]"}>
              {week.is_favorite ? "⭐" : "☆"}
            </span>
          </button>
        )}
      </div>

      {week.is_shared && (
        <span className="mt-2 inline-block rounded-full bg-[#F0E7F2] px-2.5 py-1 text-xs font-semibold text-[#8E4E9E] dark:bg-purple-950/40 dark:text-purple-300">
          {daParceira
            ? `👥 dividida com ${nomeDono || "parceira"}`
            : week.person2_name
              ? `👥 dividida com ${week.person2_name}`
              : "👥 conjunta"}
        </span>
      )}

      <p className="mt-2.5 text-[13px] text-slate-500 dark:text-slate-400">
        {meta}
      </p>
      {week.notes && (
        <p className="mt-1 text-[13px] italic text-slate-500 dark:text-slate-400">
          &ldquo;{week.notes}&rdquo;
        </p>
      )}

      <div className="mt-3.5 flex gap-1.5">
        <Link
          href={href}
          className="flex-1 rounded-[10px] bg-[#E9F0E7] py-2.5 text-center text-[13.5px] font-semibold text-emerald-700 transition hover:brightness-95 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          Abrir
        </Link>
        <button
          onClick={onDuplicate}
          className="rounded-[10px] border border-[#E7DECD] bg-[#FCFAF5] px-3 text-[13px] transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800"
          title="Duplicar"
        >
          📋
        </button>
        {!daParceira && (
          <button
            onClick={onDelete}
            disabled={deletando}
            className="rounded-[10px] border border-[#F0DAD2] bg-[#FCF4F1] px-3 text-[13px] transition hover:brightness-95 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/20"
            title="Excluir"
          >
            {deletando ? "…" : "🗑️"}
          </button>
        )}
      </div>
    </div>
  );
}
