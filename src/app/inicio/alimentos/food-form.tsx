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

  const bigInput =
    "w-full rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const numInput =
    "w-full rounded-[10px] border border-[#E2D7C4] bg-[#FCFAF5] px-2.5 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const numLabel =
    "mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400";

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(38,34,28,0.5)] p-[18px] backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-[22px] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.5)] dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-[18px] text-[21px] font-bold tracking-tight">
          {food ? "Editar alimento" : "Novo alimento"}
        </h2>

        <form onSubmit={handleSubmit}>
          <label className="mb-1.5 block text-[13px] font-semibold">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={`${bigInput} mb-3.5`}
            placeholder="Ex.: Frango grelhado"
          />

          <label className="mb-1.5 block text-[13px] font-semibold">
            Categoria
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Food["category"])}
            className={`${bigInput} mb-3.5 cursor-pointer`}
          >
            <option value="proteina">Proteína</option>
            <option value="carbo">Carboidrato</option>
            <option value="vegetal">Vegetal</option>
            <option value="fruta">Fruta</option>
            <option value="outro">Outro</option>
          </select>

          <div className="mb-3.5 grid grid-cols-2 gap-2.5">
            <div>
              <label className={numLabel}>kcal / 100g</label>
              <input
                type="number"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                step="0.1"
                className={numInput}
              />
            </div>
            <div>
              <label className={numLabel}>FC (cozido ÷ cru)</label>
              <input
                type="number"
                value={fc}
                onChange={(e) => setFc(e.target.value)}
                step="0.01"
                className={numInput}
              />
            </div>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2">
            <div>
              <label className={numLabel}>Prot (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                step="0.1"
                className={numInput}
              />
            </div>
            <div>
              <label className={numLabel}>Carb (g)</label>
              <input
                type="number"
                value={carb}
                onChange={(e) => setCarb(e.target.value)}
                step="0.1"
                className={numInput}
              />
            </div>
            <div>
              <label className={numLabel}>Gord (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                step="0.1"
                className={numInput}
              />
            </div>
          </div>

          {erro && (
            <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              {erro}
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#E2D7C4] bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {carregando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
