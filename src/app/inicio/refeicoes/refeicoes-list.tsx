"use client";

import { Event, RecipeWithIngredients, Food } from "@/lib/types";
import { deleteEvent } from "@/lib/api/events";
import RefeicaoForm from "./refeicao-form";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Props {
  events: Event[];
  recipes: RecipeWithIngredients[];
  foods: Food[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate();
  const monthShort = date.toLocaleDateString("pt-BR", { month: "short" });
  return `${day} ${monthShort}`;
}

export default function RefeicoesList({ events, recipes, foods }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const foodsMap = useMemo(() => {
    const m: Record<string, Food> = {};
    foods.forEach((f) => (m[f.id] = f));
    return m;
  }, [foods]);

  // Abre o modal de edição automaticamente ao vir da página de detalhe (?edit=<id>).
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    const alvo = events.find((e) => e.id === editId);
    if (alvo) setEditing(alvo);
  }, [searchParams, events]);

  async function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que quer deletar esta refeição?")) return;
    setDeletandoId(id);
    setErro(null);
    try {
      await deleteEvent(id);
      // Recarregar página
      window.location.reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao deletar");
      setDeletandoId(null);
    }
  }

  const handleSuccess = () => {
    setIsCreating(false);
    setEditing(null);
    window.location.reload();
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[clamp(26px,4vw,34px)] font-bold tracking-tight">
            Refeições
          </h1>
          <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">
            {events.length} refeição{events.length === 1 ? "" : "s"} · jantares,
            almoços e eventos
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-xl bg-emerald-600 px-[18px] py-2.5 text-[15px] font-semibold text-white transition hover:bg-emerald-700"
        >
          + Nova refeição
        </button>
      </div>

      {erro && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#E7DECD] bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-[15px] text-slate-500 dark:text-slate-400">
            Nenhuma refeição planejada ainda. Crie uma (ex.:{" "}
            <strong>Janta com 7 pessoas</strong>) para saber quanto comprar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex flex-col rounded-[16px] border border-[#EADFCD] bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              style={{ borderLeft: "4px solid #2E6B47" }}
            >
              <Link
                href={`/inicio/refeicoes/ver/${e.id}`}
                className="group flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-bold [font-family:var(--font-display)] group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    🍽️ {e.title}
                  </p>
                  <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
                    {e.base_people_count} pessoa{e.base_people_count === 1 ? "" : "s"}
                  </p>
                </div>
                {e.event_date && (
                  <span className="shrink-0 rounded-full bg-[#F7F2E9] px-2.5 py-1 text-[11.5px] font-medium dark:bg-slate-800">
                    {formatDate(e.event_date)}
                  </span>
                )}
              </Link>

              <div className="mt-3 flex gap-2">
                <Link
                  href={`/inicio/refeicoes/ver/${e.id}`}
                  className="flex-1 rounded-[9px] bg-[#E9F0E7] py-2 text-center text-[13px] font-semibold text-emerald-700 transition hover:brightness-95 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  👁️ Ver
                </Link>
                <button
                  onClick={() => setEditing(e)}
                  className="flex-1 rounded-[9px] border border-[#E7DECD] bg-[#FCFAF5] py-2 text-[13px] font-semibold transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDelete(e.id)}
                  disabled={deletandoId === e.id}
                  className="rounded-[9px] border border-[#F0DAD2] bg-[#FCF4F1] px-3 py-2 text-[13px] transition hover:brightness-95 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/20"
                  title="Excluir"
                >
                  {deletandoId === e.id ? "…" : "🗑️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(isCreating || editing) && (
        <RefeicaoForm
          event={editing ?? undefined}
          recipes={recipes}
          foods={foods}
          onClose={() => {
            setIsCreating(false);
            setEditing(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
