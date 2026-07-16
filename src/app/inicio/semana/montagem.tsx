"use client";

import { WeekItemResult } from "@/lib/calc";
import { RecipeWithIngredients } from "@/lib/types";
import GuiaPreparo from "./guia-preparo";

// Uma pessoa na montagem: nome, quantas marmitas ela tem e os itens (já
// calculados) que vão nas marmitas dela.
export interface PessoaMontagem {
  nome: string;
  numMarmitas: number;
  itens: WeekItemResult[];
}

// Overlay em tela cheia para a "montagem das marmitas": mostra, por pessoa,
// quanto de cada alimento (COZIDO) vai em cada marmita. Só exibição — os dados
// vêm dos resumos já calculados (WeekItemResult). Sem cálculo novo.
export default function MontagemMarmitas({
  pessoas,
  receitas = [],
  onClose,
}: {
  pessoas: PessoaMontagem[];
  receitas?: RecipeWithIngredients[];
  onClose: () => void;
}) {
  const comItens = pessoas.filter((p) => p.itens.length > 0);

  // Total cozido a fazer, unificado: soma o total de todas as pessoas por
  // alimento (é o que se cozinha junto na panela), preservando a ordem.
  const totalCozido = new Map<string, { name: string; grams: number }>();
  comItens.forEach((pessoa) => {
    pessoa.itens.forEach((item) => {
      const grams = item.cookedGramsPerMarmita * item.numMarmitas;
      const ex = totalCozido.get(item.food.id);
      if (ex) ex.grams += grams;
      else totalCozido.set(item.food.id, { name: item.food.name, grams });
    });
  });
  const totalCozidoArr = Array.from(totalCozido.values());

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#F7F2E9] dark:bg-slate-950">
      {/* Barra fixa no topo */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#E7DECD] bg-[#F7F2E9]/90 px-5 py-3.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <h2 className="text-[19px] font-bold [font-family:var(--font-display)]">
          🍱 Montagem das marmitas
        </h2>
        <button
          onClick={onClose}
          className="rounded-[11px] bg-[#EFE7D8] px-4 py-2 text-sm font-semibold text-slate-600 transition hover:brightness-95 dark:bg-slate-800 dark:text-slate-300"
        >
          ✕ Fechar
        </button>
      </div>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {comItens.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Nenhum alimento para montar ainda.
          </p>
        ) : (
          <div
            className={
              "mx-auto grid w-full max-w-[1000px] grid-cols-1 gap-6" +
              (comItens.length > 1 ? " md:grid-cols-2" : " max-w-[560px]")
            }
          >
            {comItens.map((pessoa, i) => (
              <div key={i}>
                <p className="mb-4 text-[15px] text-slate-600 dark:text-slate-400">
                  Quanto de cada alimento (já{" "}
                  <strong className="text-slate-900 dark:text-slate-200">
                    cozido
                  </strong>
                  ) vai em cada uma das{" "}
                  <strong className="text-slate-900 dark:text-slate-200">
                    {pessoa.numMarmitas}
                  </strong>{" "}
                  marmitas de {pessoa.nome}.
                </p>

                <div className="overflow-hidden rounded-[20px] border border-[#EADFCD] bg-white dark:border-slate-800 dark:bg-slate-900">
                  <div className="bg-emerald-700 px-[18px] py-3.5 text-base font-bold text-white [font-family:var(--font-display)]">
                    👤 Cada marmita leva
                  </div>
                  {pessoa.itens.map((item, j) => {
                    const parcial =
                      item.numMarmitas > 0 &&
                      item.numMarmitas < pessoa.numMarmitas;
                    return (
                      <div
                        key={j}
                        className="flex items-baseline justify-between gap-3 border-b border-[#F0E9DA] px-[18px] py-3.5 dark:border-slate-800"
                      >
                        <span className="text-base font-medium">
                          {item.food.name}
                          {parcial && (
                            <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                              (em {item.numMarmitas} das {pessoa.numMarmitas})
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-lg font-bold text-emerald-700 [font-family:var(--font-display)] dark:text-emerald-400">
                          {item.cookedGramsPerMarmita.toFixed(0)} g
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total cozido a fazer — unificado (o que se cozinha junto na panela) */}
        {totalCozidoArr.length > 0 && (
          <div className="mx-auto mt-6 w-full max-w-[560px]">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400">
              Total cozido a fazer
            </p>
            <div className="rounded-2xl bg-[#EFE7D8] px-[18px] py-2 dark:bg-slate-800">
              {totalCozidoArr.map((item, j) => (
                <div
                  key={j}
                  className="flex items-baseline justify-between gap-3 border-b border-[#E2D8C6] py-2 last:border-b-0 dark:border-slate-700"
                >
                  <span className="text-[14.5px] text-slate-600 dark:text-slate-400">
                    {item.name}
                  </span>
                  <span className="text-[14.5px] font-bold text-slate-900 dark:text-slate-100">
                    {item.grams.toFixed(0)} g
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {receitas.length > 0 && (
          <div className="mx-auto mt-6 w-full max-w-[1000px]">
            <GuiaPreparo receitas={receitas} />
          </div>
        )}
      </div>
    </div>
  );
}
