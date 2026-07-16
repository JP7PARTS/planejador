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

// Um grupo de itens por receita (preserva a ordem; recipeId null = avulso).
interface GrupoItens {
  recipeId: string | null;
  titulo: string | null;
  itens: WeekItemResult[];
}

// Agrupa os itens de uma pessoa por receita, na ordem de 1ª aparição.
function agruparPorReceita(
  itens: WeekItemResult[],
  tituloPorReceita: Map<string, string>
): GrupoItens[] {
  const grupos: GrupoItens[] = [];
  const idx = new Map<string, GrupoItens>();
  itens.forEach((item) => {
    const rid = item.recipe_id ?? null;
    const chave = rid ?? "__avulso__";
    let g = idx.get(chave);
    if (!g) {
      g = {
        recipeId: rid,
        titulo: rid ? tituloPorReceita.get(rid) ?? "Receita" : null,
        itens: [],
      };
      idx.set(chave, g);
      grupos.push(g);
    }
    g.itens.push(item);
  });
  return grupos;
}

// Total cozido unificado, agrupado por receita e somado por alimento entre
// todas as pessoas (é o que se cozinha junto na panela).
interface TotalItem {
  name: string;
  grams: number;
}
interface GrupoTotal {
  recipeId: string | null;
  titulo: string | null;
  itens: TotalItem[];
}

function totalCozidoAgrupado(
  pessoas: PessoaMontagem[],
  tituloPorReceita: Map<string, string>
): GrupoTotal[] {
  const grupos: GrupoTotal[] = [];
  const idx = new Map<
    string,
    { grupo: GrupoTotal; porFood: Map<string, TotalItem> }
  >();
  pessoas.forEach((pessoa) => {
    pessoa.itens.forEach((item) => {
      const rid = item.recipe_id ?? null;
      const chave = rid ?? "__avulso__";
      let entry = idx.get(chave);
      if (!entry) {
        const grupo: GrupoTotal = {
          recipeId: rid,
          titulo: rid ? tituloPorReceita.get(rid) ?? "Receita" : null,
          itens: [],
        };
        entry = { grupo, porFood: new Map() };
        idx.set(chave, entry);
        grupos.push(grupo);
      }
      const grams = item.cookedGramsPerMarmita * item.numMarmitas;
      const ex = entry.porFood.get(item.food.id);
      if (ex) {
        ex.grams += grams;
      } else {
        const ti: TotalItem = { name: item.food.name, grams };
        entry.porFood.set(item.food.id, ti);
        entry.grupo.itens.push(ti);
      }
    });
  });
  return grupos;
}

// Overlay em tela cheia para a "montagem das marmitas": mostra, por pessoa,
// quanto de cada alimento (COZIDO) vai em cada marmita, agrupado por receita.
// Só exibição — os dados vêm dos resumos já calculados (WeekItemResult).
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

  const tituloPorReceita = new Map(receitas.map((r) => [r.id, r.title]));
  const totalGrupos = totalCozidoAgrupado(comItens, tituloPorReceita);

  // Cabeçalho de receita reutilizado nas duas seções.
  const cabecalhoReceita = (titulo: string) => (
    <div className="bg-[#F4EFE4] px-[18px] py-2 text-[11.5px] font-bold uppercase tracking-[0.05em] text-emerald-800 dark:bg-slate-800 dark:text-emerald-300">
      🍲 {titulo}
    </div>
  );

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
            {comItens.map((pessoa, i) => {
              const grupos = agruparPorReceita(pessoa.itens, tituloPorReceita);
              return (
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
                    {grupos.map((grupo, gi) => (
                      <div key={gi}>
                        {grupo.titulo && cabecalhoReceita(grupo.titulo)}
                        {grupo.itens.map((item, j) => {
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
                                    (em {item.numMarmitas} das{" "}
                                    {pessoa.numMarmitas})
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
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Total cozido a fazer — unificado e agrupado por receita */}
        {totalGrupos.length > 0 && (
          <div className="mx-auto mt-6 w-full max-w-[560px]">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400">
              Total cozido a fazer
            </p>
            <div className="overflow-hidden rounded-2xl bg-[#EFE7D8] dark:bg-slate-800">
              {totalGrupos.map((grupo, gi) => (
                <div key={gi}>
                  {grupo.titulo && (
                    <div className="bg-[#E7DCC7] px-[18px] py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      🍲 {grupo.titulo}
                    </div>
                  )}
                  <div className="px-[18px]">
                    {grupo.itens.map((item, j) => (
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
