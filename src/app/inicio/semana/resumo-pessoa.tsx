"use client";

import { WeekSummary } from "@/lib/calc";

// Cartão de resumo de uma pessoa (lista de compras crua + nutrição).
// Usado na semana conjunta (montar) e na visualização da semana do casal.
export default function ResumoPessoa({
  titulo,
  resumo,
}: {
  titulo: string;
  resumo: WeekSummary | null;
}) {
  const temItens = resumo && resumo.items.length > 0;

  return (
    <div className="rounded-[20px] border border-[#EADFCD] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-2 font-bold [font-family:var(--font-display)]">
        👤 {titulo}
      </h3>

      {!temItens ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nenhum alimento para esta pessoa.
        </p>
      ) : (
        <>
          <div className="space-y-1 text-sm">
            {Object.entries(resumo!.totalRawPerFood).map(([foodName, grams]) => (
              <div key={foodName} className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">
                  {foodName}
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {grams.toFixed(0)} g
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#EFE7D8] pt-2 text-xs dark:border-slate-800">
            <div>
              <p className="text-slate-500 dark:text-slate-400">kcal total</p>
              <p className="font-bold">{resumo!.totalKcal.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">prot total</p>
              <p className="font-bold text-rose-500">
                {resumo!.totalProtein.toFixed(0)} g
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">kcal/marmita</p>
              <p className="font-bold">
                {resumo!.avgKcalPerMarmita.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">prot/marmita</p>
              <p className="font-bold text-rose-500">
                {resumo!.avgProteinPerMarmita.toFixed(0)} g
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
