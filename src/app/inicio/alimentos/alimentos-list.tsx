"use client";

import { Food } from "@/lib/types";
import { deleteFood } from "@/lib/api/foods";
import FoodForm from "./food-form";
import { useState } from "react";

interface Props {
  alimentos: Food[];
  onRefresh: () => void;
}

const CATEGORIAS = {
  carbo: { label: "Carboidratos", cor: "amber" },
  proteina: { label: "Proteínas", cor: "rose" },
  vegetal: { label: "Vegetais", cor: "emerald" },
  fruta: { label: "Frutas", cor: "orange" },
  outro: { label: "Outros", cor: "slate" },
} as const;

export default function AlimentosList({ alimentos, onRefresh }: Props) {
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [erroDelete, setErroDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que quer deletar este alimento?")) {
      return;
    }

    setDeletandoId(id);
    setErroDelete(null);

    try {
      await deleteFood(id);
      onRefresh();
    } catch (err) {
      setErroDelete(err instanceof Error ? err.message : "Erro ao deletar");
      setDeletandoId(null);
    }
  }

  return (
    <>
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
        >
          + Novo Alimento
        </button>
      </div>

      {erroDelete && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erroDelete}
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(CATEGORIAS).map(([categoria, { label, cor }]) => {
          const porCategoria = alimentos.filter((f) => f.category === categoria);
          if (porCategoria.length === 0) return null;

          const corClasses = {
            amber: "bg-amber-500/5 border-amber-300 dark:border-amber-800",
            rose: "bg-rose-500/5 border-rose-300 dark:border-rose-800",
            emerald: "bg-emerald-500/5 border-emerald-300 dark:border-emerald-800",
            orange: "bg-orange-500/5 border-orange-300 dark:border-orange-800",
            slate: "bg-slate-500/5 border-slate-300 dark:border-slate-800",
          };

          return (
            <section key={categoria}>
              <h2 className="mb-3 text-lg font-semibold">{label}</h2>
              <div className="space-y-2">
                {porCategoria.map((alimento) => (
                  <div
                    key={alimento.id}
                    className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${corClasses[cor as keyof typeof corClasses]}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{alimento.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        FC: {alimento.fc.toFixed(2)} • Nutrição por 100g CRU
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">kcal/100g</p>
                        <p className="font-semibold">{alimento.kcal_per_100g.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">prot/100g</p>
                        <p className="font-semibold">{alimento.protein_g_per_100g.toFixed(1)}g</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">carb/100g</p>
                        <p className="font-semibold">{alimento.carb_g_per_100g.toFixed(1)}g</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">gord/100g</p>
                        <p className="font-semibold">{alimento.fat_g_per_100g.toFixed(1)}g</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingFood(alimento)}
                        className="rounded px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(alimento.id)}
                        disabled={deletandoId === alimento.id}
                        className="rounded px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-200 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                        title="Deletar"
                      >
                        {deletandoId === alimento.id ? "…" : "🗑️"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {(editingFood || isCreating) && (
        <FoodForm
          food={editingFood ?? undefined}
          onClose={() => {
            setEditingFood(null);
            setIsCreating(false);
          }}
          onSuccess={() => {
            setEditingFood(null);
            setIsCreating(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
