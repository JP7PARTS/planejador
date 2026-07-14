"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { EventWithRecipes, Food, RecipeWithIngredients } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  getEvent,
  deleteEvent,
  calcularListaCompras,
  tempoMaximo,
  porcoesEfetivas,
} from "@/lib/api/events";
import { ShoppingListItem } from "@/lib/calc";
import ListaCompras from "../../../semana/lista-compras";
import GuiaPreparo from "../../../semana/guia-preparo";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate();
  const monthShort = date.toLocaleDateString("pt-BR", { month: "short" });
  return `${day} ${monthShort}`;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export default function VerRefeicaoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [evento, setEvento] = useState<EventWithRecipes | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [deletando, setDeletando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);
      const supabase = createClient();
      const [{ data: foodsData }, ev] = await Promise.all([
        supabase.from("foods").select("*").order("name"),
        getEvent(id),
      ]);
      setFoods(foodsData || []);
      setEvento(ev);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleDelete() {
    if (!window.confirm("Tem certeza que quer deletar esta refeição?")) return;
    setDeletando(true);
    try {
      await deleteEvent(id);
      router.push("/inicio/refeicoes");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao deletar");
      setDeletando(false);
    }
  }

  const eventRecipes = evento?.event_recipes ?? [];

  // Porções equivalentes de adulto (adultos + crianças com seus fatores).
  const porcoes = evento
    ? porcoesEfetivas(evento.adults, evento.kids_older, evento.kids_young)
    : 0;

  // Lista de compras consolidada (aplica as escolhas de carne e escala pelas porções).
  const itensCompra: ShoppingListItem[] = calcularListaCompras(
    eventRecipes,
    foods,
    porcoes
  ).map((item) => ({
    name: item.food_name,
    grams: item.quantity_grams,
    category: item.category as Food["category"],
  }));

  // Receitas para o guia de preparo (passos reais, tempos, dicas).
  const receitasPreparo: RecipeWithIngredients[] = eventRecipes
    .map((er) => er.recipe)
    .filter((r): r is RecipeWithIngredients => !!r);

  const tempoTotal = tempoMaximo(eventRecipes);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6 sm:py-8">
      <div>
        <Link
          href="/inicio/refeicoes"
          className="text-[13.5px] font-semibold text-emerald-700 transition hover:underline dark:text-emerald-400"
        >
          ← Refeições
        </Link>
      </div>

      {erro && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando…
        </p>
      ) : !evento ? null : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[clamp(24px,4vw,32px)] font-bold tracking-tight [font-family:var(--font-display)]">
                🍽️ {evento.title}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14.5px] text-slate-500 dark:text-slate-400">
                <span>
                  👥 {evento.adults} adulto{evento.adults === 1 ? "" : "s"}
                  {evento.kids_older > 0 &&
                    ` · ${evento.kids_older} criança${
                      evento.kids_older === 1 ? "" : "s"
                    } 7–12`}
                  {evento.kids_young > 0 &&
                    ` · ${evento.kids_young} criança${
                      evento.kids_young === 1 ? "" : "s"
                    } até 6`}
                </span>
                <span aria-hidden>·</span>
                <span>≈ {fmt(porcoes)} porç{porcoes === 1 ? "ão" : "ões"}</span>
                {evento.event_date && (
                  <>
                    <span aria-hidden>·</span>
                    <span>📅 {formatDate(evento.event_date)}</span>
                  </>
                )}
                {tempoTotal && (
                  <>
                    <span aria-hidden>·</span>
                    <span>⏱️ {tempoTotal} min</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/inicio/refeicoes?edit=${evento.id}`}
                className="rounded-[10px] border border-[#E7DECD] bg-[#FCFAF5] px-3.5 py-2 text-[13.5px] font-semibold transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800"
              >
                ✏️ Editar
              </Link>
              <button
                onClick={handleDelete}
                disabled={deletando}
                className="rounded-[10px] border border-[#F0DAD2] bg-[#FCF4F1] px-3.5 py-2 text-[13.5px] font-semibold text-rose-600 transition hover:brightness-95 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/20"
              >
                {deletando ? "…" : "🗑️ Excluir"}
              </button>
            </div>
          </header>

          {/* Lista de compras completa (por categoria, com checkboxes e enviar) */}
          <ListaCompras
            titulo={evento.title}
            itens={itensCompra}
            storageKey={"refeicao-" + id}
          />

          {/* Modo de preparo com os passos reais */}
          {receitasPreparo.length > 0 && (
            <GuiaPreparo receitas={receitasPreparo} />
          )}
        </>
      )}
    </main>
  );
}
