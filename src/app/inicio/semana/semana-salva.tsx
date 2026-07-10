"use client";

import {
  createWeek,
  addWeekItem,
  updateWeek,
  replaceWeekItems,
  replaceWeekRecipes,
  WeekItemData,
} from "@/lib/api/weeks";
import { WeekItem } from "@/lib/calc";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface Props {
  semanaId?: string | null; // se presente, é edição de uma semana salva
  tituloInicial?: string;
  linhas: WeekItem[];
  numMarmitas: number;
  notas: string;
  extras: string[];
  isShared: boolean;
  person2Name: string;
  numMarmitasP2: number;
  recipeIds?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function SemanaSalvaModal({
  semanaId,
  tituloInicial,
  linhas,
  numMarmitas,
  notas,
  extras,
  isShared,
  person2Name,
  numMarmitasP2,
  recipeIds = [],
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [titulo, setTitulo] = useState(tituloInicial || "");

  const editando = !!semanaId;

  // Monta a lista de itens (ignorando linhas sem alimento) para as APIs.
  function itensParaSalvar(): WeekItemData[] {
    return linhas
      .filter((l) => l.foodId)
      .map((l) => ({
        food_id: l.foodId,
        cooked_grams_per_marmita: l.cookedGramsPerMarmita,
        num_marmitas: l.numMarmitas,
        person: isShared ? l.person ?? 1 : 1,
      }));
  }

  function validar() {
    if (!titulo.trim()) {
      throw new Error("Título da semana é obrigatório");
    }
    if (linhas.filter((l) => l.foodId).length === 0) {
      throw new Error("Adicione pelo menos um alimento antes de salvar");
    }
  }

  // Cria uma semana nova (fluxo padrão e "Salvar como nova").
  async function salvarComoNova(e?: FormEvent) {
    e?.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      validar();

      const week = await createWeek({
        title: titulo.trim(),
        notes: notas || undefined,
        num_marmitas: numMarmitas,
        is_shared: isShared,
        person2_name: isShared ? person2Name.trim() || null : null,
        num_marmitas_p2: isShared ? numMarmitasP2 : 0,
        extras,
      });

      for (const item of itensParaSalvar()) {
        await addWeekItem(week.id, item);
      }
      await replaceWeekRecipes(week.id, recipeIds);

      onSuccess();
      router.push("/inicio/semanas");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido");
      setCarregando(false);
    }
  }

  // Atualiza a semana aberta (sobrescreve dados + itens).
  async function atualizar(e?: FormEvent) {
    e?.preventDefault();
    if (!semanaId) return;
    setErro(null);
    setCarregando(true);
    try {
      validar();

      await updateWeek(semanaId, {
        title: titulo.trim(),
        notes: notas || undefined,
        num_marmitas: numMarmitas,
        is_shared: isShared,
        person2_name: isShared ? person2Name.trim() || null : null,
        num_marmitas_p2: isShared ? numMarmitasP2 : 0,
        extras,
      });
      await replaceWeekItems(semanaId, itensParaSalvar());
      await replaceWeekRecipes(semanaId, recipeIds);

      onSuccess();
      router.push("/inicio/semanas");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido");
      setCarregando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900">
        <h2 className="text-xl font-bold">
          {editando ? "Salvar Alterações" : "Salvar Semana"}
        </h2>

        <form
          onSubmit={editando ? atualizar : salvarComoNova}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium">
              Nome da semana *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
              required
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
              placeholder="Ex.: Segunda - Arroz e Frango"
            />
          </div>

          {erro && (
            <div className="rounded bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              {erro}
            </div>
          )}

          {editando ? (
            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={carregando}
                  className="flex-1 rounded bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {carregando ? "Salvando…" : "Atualizar semana"}
                </button>
                <button
                  type="button"
                  onClick={() => salvarComoNova()}
                  disabled={carregando}
                  className="flex-1 rounded border border-emerald-600 px-4 py-2 font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                >
                  Salvar como nova
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded border border-slate-300 px-4 py-2 font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded border border-slate-300 px-4 py-2 font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={carregando}
                className="flex-1 rounded bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {carregando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
