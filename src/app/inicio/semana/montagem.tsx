"use client";

import { WeekItemResult } from "@/lib/calc";

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
  onClose,
}: {
  pessoas: PessoaMontagem[];
  onClose: () => void;
}) {
  const comItens = pessoas.filter((p) => p.itens.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950">
      {/* Barra fixa no topo */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-lg font-bold">🍱 Montagem das marmitas</h2>
        <button
          onClick={onClose}
          className="rounded bg-slate-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          ✕ Fechar
        </button>
      </div>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Quanto de cada alimento (já <strong>cozido</strong>) vai em cada
          marmita. É só encher os potes seguindo os números.
        </p>

        {comItens.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Nenhum alimento para montar ainda.
          </p>
        ) : (
          <div
            className={
              "grid grid-cols-1 gap-4" +
              (comItens.length > 1 ? " sm:grid-cols-2" : "")
            }
          >
            {comItens.map((pessoa, i) => (
              <div
                key={i}
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"
              >
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                  👤 Marmitas de {pessoa.nome}
                </h3>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  {pessoa.numMarmitas} marmita
                  {pessoa.numMarmitas === 1 ? "" : "s"}
                </p>

                <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                  Cada marmita leva (cozido):
                </p>
                <ul className="mt-2 space-y-2">
                  {pessoa.itens.map((item, j) => {
                    // Aviso quando o alimento não vai em todas as marmitas
                    // da pessoa.
                    const parcial =
                      item.numMarmitas > 0 &&
                      item.numMarmitas < pessoa.numMarmitas;
                    return (
                      <li
                        key={j}
                        className="flex items-baseline justify-between gap-3 border-t border-emerald-200/70 pt-2 first:border-t-0 first:pt-0 dark:border-emerald-900/70"
                      >
                        <div>
                          <span className="text-slate-700 dark:text-slate-200">
                            {item.food.name}
                          </span>
                          {parcial && (
                            <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                              (em {item.numMarmitas} das {pessoa.numMarmitas}{" "}
                              marmitas)
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-300">
                          {item.cookedGramsPerMarmita.toFixed(0)}g
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Referência: total cozido a distribuir por alimento. */}
                <div className="mt-3 border-t border-emerald-200 pt-2 dark:border-emerald-900">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Total cozido a fazer (referência):
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {pessoa.itens.map((item, j) => (
                      <li
                        key={j}
                        className="flex items-baseline justify-between gap-3 text-xs text-slate-500 dark:text-slate-400"
                      >
                        <span>{item.food.name}</span>
                        <span>
                          {(
                            item.cookedGramsPerMarmita * item.numMarmitas
                          ).toFixed(0)}
                          g
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
