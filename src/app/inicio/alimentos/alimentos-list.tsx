"use client";

import { Food } from "@/lib/types";
import { deleteFood } from "@/lib/api/foods";
import FoodForm from "./food-form";
import { useState } from "react";

interface Props {
  alimentos: Food[];
  onRefresh: () => void;
}

// Ordem e cores conforme a referência visual.
const CATEGORIAS = {
  proteina: { label: "Proteínas", emoji: "🍗", cor: "#C7572F" },
  carbo: { label: "Carboidratos", emoji: "🍚", cor: "#BF922C" },
  vegetal: { label: "Vegetais", emoji: "🥦", cor: "#2E6B47" },
  fruta: { label: "Frutas", emoji: "🍎", cor: "#C0503A" },
  outro: { label: "Outros", emoji: "🧂", cor: "#8A8172" },
} as const;

// Formata gramas: inteiro sem casas, senão 1 casa com vírgula (pt-BR).
function fmtG(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

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
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[clamp(26px,4vw,34px)] font-bold tracking-tight">
            Banco de alimentos
          </h1>
          <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">
            {alimentos.length} alimentos · nutrição por 100g cru
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-xl bg-emerald-600 px-[18px] py-2.5 text-[15px] font-semibold text-white transition hover:bg-emerald-700"
        >
          + Novo alimento
        </button>
      </div>

      {erroDelete && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erroDelete}
        </div>
      )}

      <div className="flex flex-col gap-[22px]">
        {Object.entries(CATEGORIAS).map(([categoria, { label, emoji, cor }]) => {
          const porCategoria = alimentos.filter((f) => f.category === categoria);
          if (porCategoria.length === 0) return null;

          return (
            <section key={categoria}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="text-lg">{emoji}</span>
                <h2 className="text-lg font-bold" style={{ color: cor }}>
                  {label}
                </h2>
                <span className="text-[13px] font-semibold text-slate-400">
                  {porCategoria.length}
                </span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
                {porCategoria.map((alimento) => (
                  <div
                    key={alimento.id}
                    className="flex items-center gap-3 rounded-[14px] border border-[#EADFCD] bg-white p-[13px_15px] dark:border-slate-800 dark:bg-slate-900"
                    style={{ borderLeft: `4px solid ${cor}` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15.5px] font-semibold">
                        {alimento.name}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                        {alimento.kcal_per_100g.toFixed(0)} kcal ·{" "}
                        {fmtG(alimento.protein_g_per_100g)}P ·{" "}
                        {fmtG(alimento.carb_g_per_100g)}C ·{" "}
                        {fmtG(alimento.fat_g_per_100g)}G
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-slate-400">
                        FC {alimento.fc.toFixed(2)} · cozido ÷ cru
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setEditingFood(alimento)}
                        className="h-[30px] w-8 rounded-[9px] border border-[#E7DECD] bg-[#FCFAF5] text-[13px] transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(alimento.id)}
                        disabled={deletandoId === alimento.id}
                        className="h-[30px] w-8 rounded-[9px] border border-[#F0DAD2] bg-[#FCF4F1] text-[13px] transition hover:brightness-95 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/20"
                        title="Excluir"
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
