"use client";

import { createWeek, addWeekItem } from "@/lib/api/weeks";
import { WeekItem } from "@/lib/calc";
import { FormEvent, useState } from "react";

interface Props {
  linhas: WeekItem[];
  numMarmitas: number;
  notas: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SemanaSalvaModal({
  linhas,
  numMarmitas,
  notas,
  onClose,
  onSuccess,
}: Props) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      if (!titulo.trim()) {
        throw new Error("Título da semana é obrigatório");
      }

      if (linhas.length === 0) {
        throw new Error("Adicione pelo menos um alimento antes de salvar");
      }

      // Cria a semana
      const week = await createWeek({
        title: titulo.trim(),
        notes: notas || undefined,
        num_marmitas: numMarmitas,
      });

      // Adiciona cada item à semana
      for (const linha of linhas) {
        if (linha.foodId) {
          await addWeekItem(week.id, {
            food_id: linha.foodId,
            cooked_grams_per_marmita: linha.cookedGramsPerMarmita,
            num_marmitas: linha.numMarmitas,
          });
        }
      }

      setTitulo("");
      onClose();
      onSuccess();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido");
      setCarregando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Salvar Semana</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
        </form>
      </div>
    </div>
  );
}
