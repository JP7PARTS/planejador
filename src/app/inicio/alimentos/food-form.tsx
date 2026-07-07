"use client";

import { Food } from "@/lib/types";
import { createFood, updateFood } from "@/lib/api/foods";
import { FormEvent, useState } from "react";

interface Props {
  food?: Food;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FoodForm({ food, onClose, onSuccess }: Props) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [name, setName] = useState(food?.name ?? "");
  const [category, setCategory] = useState<Food["category"]>(food?.category ?? "carbo");
  const [kcal, setKcal] = useState(String(food?.kcal_per_100g ?? ""));
  const [protein, setProtein] = useState(String(food?.protein_g_per_100g ?? ""));
  const [carb, setCarb] = useState(String(food?.carb_g_per_100g ?? ""));
  const [fat, setFat] = useState(String(food?.fat_g_per_100g ?? ""));
  const [fc, setFc] = useState(String(food?.fc ?? "1.0"));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const payload = {
        name: name.trim(),
        category,
        kcal_per_100g: Number(kcal),
        protein_g_per_100g: Number(protein),
        carb_g_per_100g: Number(carb),
        fat_g_per_100g: Number(fat),
        fc: Number(fc),
      };

      if (food) {
        await updateFood(food.id, payload);
      } else {
        await createFood(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido");
      setCarregando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900">
        <h2 className="text-xl font-bold">
          {food ? "Editar Alimento" : "Novo Alimento"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium">Nome *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
              placeholder="Ex.: Frango grelhado"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Categoria *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Food["category"])}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="carbo">Carboidrato</option>
              <option value="proteina">Proteína</option>
              <option value="vegetal">Vegetal</option>
              <option value="fruta">Fruta</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium">kcal/100g</label>
              <input
                type="number"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                step="0.1"
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Fator de cocção (cozido↔cru)</label>
              <input
                type="number"
                value={fc}
                onChange={(e) => setFc(e.target.value)}
                step="0.01"
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium">Prot (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                step="0.1"
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Carb (g)</label>
              <input
                type="number"
                value={carb}
                onChange={(e) => setCarb(e.target.value)}
                step="0.1"
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Gord (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                step="0.1"
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
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
