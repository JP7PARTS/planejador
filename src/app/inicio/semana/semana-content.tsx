"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Food, WeekItemDB, RecipeWithIngredients } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  calculateWeekSummary,
  calculateWeekItem,
  buildShoppingList,
  WeekItem,
  WeekItemResult,
  WeekSummary,
} from "@/lib/calc";
import { getWeek } from "@/lib/api/weeks";
import { listRecipes, agruparIngredientes } from "@/lib/api/recipes";
import { getHouseholdSummary } from "@/lib/api/household";
import SemanaSalvaModal from "./semana-salva";
import ResumoPessoa from "./resumo-pessoa";
import ListaCompras from "./lista-compras";
import AlimentoSelect from "./alimento-select";
import MontagemMarmitas, { PessoaMontagem } from "./montagem";
import ReceitaPicker, { EscolhaResolvida } from "./receita-picker";
import ReceitaNaSemana, { ItemGrupo } from "./receita-na-semana";
import GuiaPreparo from "./guia-preparo";
import Link from "next/link";

// Uma linha da UI = um alimento com os dados das duas pessoas (na semana
// conjunta). No modo normal, só a pessoa 1 é usada. A lista plana de WeekItem
// (que calc/save/modal consomem) é derivada destas linhas.
interface FoodRow {
  foodId: string;
  p1On: boolean;
  p1Grams: number;
  p1Marmitas: number;
  p2On: boolean;
  p2Grams: number;
  p2Marmitas: number;
  recipeId?: string | null; // de qual receita veio (agrupa no cartão de prato)
}

export default function SemanaContent() {
  const searchParams = useSearchParams();
  const semanaId = searchParams.get("semanaId");

  const [alimentos, setAlimentos] = useState<Food[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [numMarmitas, setNumMarmitas] = useState(7);
  const [rows, setRows] = useState<FoodRow[]>([]);
  const [notas, setNotas] = useState("");
  const [tituloSemana, setTituloSemana] = useState("");
  const [resumo, setResumo] = useState<WeekSummary | null>(null);
  const [mostrando, setMostrando] = useState<boolean>(false);
  const [montando, setMontando] = useState<boolean>(false);

  // Nome de quem está montando (pessoa 1) — usado nos rótulos no lugar de "Eu".
  const [meuNome, setMeuNome] = useState("Eu");

  // Complementos (temperos & básicos): base pessoal + extras desta semana.
  const [basicos, setBasicos] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [novoExtra, setNovoExtra] = useState("");

  // Semana conjunta (dividida entre você e outra pessoa)
  const [isShared, setIsShared] = useState(false);
  const [person2Name, setPerson2Name] = useState("Namorada");
  const [numMarmitasP2, setNumMarmitasP2] = useState(7);
  const [resumoEu, setResumoEu] = useState<WeekSummary | null>(null);
  const [resumoP2, setResumoP2] = useState<WeekSummary | null>(null);

  // Receitas: biblioteca do usuário + quais estão nesta semana (guia de preparo).
  const [receitasDisponiveis, setReceitasDisponiveis] = useState<
    RecipeWithIngredients[]
  >([]);
  const [receitaIdsNaSemana, setReceitaIdsNaSemana] = useState<string[]>([]);
  const [mostrarPicker, setMostrarPicker] = useState(false);

  // Texto exibido nos campos de quantidade — permite esvaziar o input durante a
  // edição sem tocar no número (que segue como fonte da verdade dos cálculos).
  // Os efeitos sincronizam o texto sempre que o número muda por outra via
  // (botões +/-, carregar uma semana salva, reset após salvar).
  const [marmitasStr, setMarmitasStr] = useState(String(numMarmitas));
  const [marmitasP2Str, setMarmitasP2Str] = useState(String(numMarmitasP2));
  useEffect(() => {
    setMarmitasStr(String(numMarmitas));
  }, [numMarmitas]);
  useEffect(() => {
    setMarmitasP2Str(String(numMarmitasP2));
  }, [numMarmitasP2]);

  // Lista plana de itens (1 ou 2 por alimento), derivada das linhas. É o que a
  // calc, o modal de salvar e o save consomem — sem mudança neles.
  const linhas: WeekItem[] = useMemo(() => {
    const itens: WeekItem[] = [];
    rows.forEach((r) => {
      if (!r.foodId) return;
      if (r.p1On && r.p1Grams > 0) {
        itens.push({
          foodId: r.foodId,
          cookedGramsPerMarmita: r.p1Grams,
          numMarmitas: r.p1Marmitas,
          person: 1,
          recipe_id: r.recipeId ?? null,
        });
      }
      if (isShared && r.p2On && r.p2Grams > 0) {
        itens.push({
          foodId: r.foodId,
          cookedGramsPerMarmita: r.p2Grams,
          numMarmitas: r.p2Marmitas,
          person: 2,
          recipe_id: r.recipeId ?? null,
        });
      }
    });
    return itens;
  }, [rows, isShared]);

  // Vínculo do casal (Etapa 8): se vinculado, a 2ª pessoa é a parceira real.
  const [linked, setLinked] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Nome de quem está montando (mesmo padrão da página inicial).
        const nome =
          (user.user_metadata?.display_name as string | undefined)?.trim() ||
          user.email?.split("@")[0] ||
          "Eu";
        setMeuNome(nome);

        // Lista pessoal de básicos (temperos que aparecem em toda semana).
        const { data: perfil } = await supabase
          .from("profiles")
          .select("staples")
          .eq("id", user.id)
          .single();
        if (perfil?.staples) setBasicos(perfil.staples as string[]);

        const summary = await getHouseholdSummary();
        const parceira = summary.members.find((u) => u.id !== user.id);
        if (parceira) {
          setLinked(true);
          setPartnerName(parceira.name);
        }
      } catch {
        // Não vinculado (ou compartilhamento inativo): mantém nome livre.
      }
    })();
  }, []);

  // Vinculado: a 2ª pessoa é sempre a parceira (nome automático).
  useEffect(() => {
    if (linked && partnerName) {
      setPerson2Name(partnerName);
    }
  }, [linked, partnerName]);

  const carregarAlimentos = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .order("category")
        .order("name");

      if (error) throw error;
      setAlimentos(data || []);

      // Receitas do usuário (para o seletor "+ Receita" e o guia de preparo).
      try {
        setReceitasDisponiveis(await listRecipes());
      } catch {
        // Sem receitas ou tabela ausente: segue sem receitas.
      }

      // Se houver semanaId, carrega a semana
      if (semanaId) {
        const weekData = await getWeek(semanaId);
        setReceitaIdsNaSemana(weekData.recipe_ids || []);
        setTituloSemana(weekData.week.title || "");
        setNumMarmitas(weekData.week.num_marmitas);
        setNotas(weekData.week.notes || "");
        setIsShared(weekData.week.is_shared ?? false);
        setPerson2Name(weekData.week.person2_name || "Namorada");
        setNumMarmitasP2(weekData.week.num_marmitas_p2 || 7);
        setExtras(weekData.week.extras || []);

        // Agrupa os itens por alimento: pessoa 1 preenche p1*, pessoa 2 p2*.
        // Itens extras do mesmo alimento/pessoa (raro) viram novas linhas.
        const porAlimento: FoodRow[] = [];
        (weekData.items || []).forEach((item: WeekItemDB) => {
          const pessoa = item.person === 2 ? 2 : 1;
          const grams = item.cooked_grams_per_marmita;
          const marms = item.num_marmitas;
          const recipeId = item.recipe_id ?? null;
          const existente = porAlimento.find(
            (r) =>
              r.foodId === item.food_id &&
              (r.recipeId ?? null) === recipeId &&
              (pessoa === 1 ? !r.p1On : !r.p2On)
          );
          const alvo = existente ?? {
            foodId: item.food_id,
            p1On: false,
            p1Grams: 100,
            p1Marmitas: weekData.week.num_marmitas || 7,
            p2On: false,
            p2Grams: 100,
            p2Marmitas: weekData.week.num_marmitas_p2 || 7,
            recipeId,
          };
          if (pessoa === 1) {
            alvo.p1On = true;
            alvo.p1Grams = grams;
            alvo.p1Marmitas = marms;
          } else {
            alvo.p2On = true;
            alvo.p2Grams = grams;
            alvo.p2Marmitas = marms;
          }
          if (!existente) porAlimento.push(alvo);
        });
        setRows(porAlimento);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, [semanaId]);

  useEffect(() => {
    carregarAlimentos();
  }, [carregarAlimentos]);

  useEffect(() => {
    if (linhas.length === 0) {
      setResumo(null);
      setResumoEu(null);
      setResumoP2(null);
      return;
    }

    const foodsMap: Record<string, Food> = {};
    alimentos.forEach((f) => {
      foodsMap[f.id] = f;
    });

    const totalMarmitas = isShared ? numMarmitas + numMarmitasP2 : numMarmitas;
    setResumo(calculateWeekSummary(linhas, foodsMap, totalMarmitas));

    if (isShared) {
      const linhasEu = linhas.filter((l) => (l.person ?? 1) === 1);
      const linhasP2 = linhas.filter((l) => l.person === 2);
      setResumoEu(calculateWeekSummary(linhasEu, foodsMap, numMarmitas));
      setResumoP2(calculateWeekSummary(linhasP2, foodsMap, numMarmitasP2));
    } else {
      setResumoEu(null);
      setResumoP2(null);
    }
  }, [linhas, numMarmitas, numMarmitasP2, isShared, alimentos]);

  function adicionarLinha() {
    const novaLinha: FoodRow = {
      foodId: "",
      p1On: true,
      p1Grams: 100,
      p1Marmitas: numMarmitas,
      // No conjunto, a 2ª pessoa já aparece ligada por padrão.
      p2On: isShared,
      p2Grams: 100,
      p2Marmitas: numMarmitasP2,
    };
    setRows([...rows, novaLinha]);
  }

  // Joga uma receita na semana: os ingredientes fixos + a opção escolhida de
  // cada "escolha" viram linhas de alimento (entram sozinhas na nutrição e na
  // lista de compras) e a receita entra no guia de preparo.
  function adicionarReceita(
    receita: RecipeWithIngredients,
    escolhas: EscolhaResolvida[]
  ) {
    const { fixos } = agruparIngredientes(receita.ingredients);
    const itens = [
      ...fixos.map((f) => ({
        foodId: f.food_id,
        grams: f.cooked_grams_per_marmita,
      })),
      ...escolhas.map((e) => ({
        foodId: e.food_id,
        grams: e.cooked_grams_per_marmita,
      })),
    ];
    const novasLinhas: FoodRow[] = itens.map((it) => ({
      foodId: it.foodId,
      p1On: true,
      p1Grams: it.grams,
      p1Marmitas: numMarmitas,
      // Prato é comido pelas duas pessoas (p2On só conta quando conjunta).
      p2On: true,
      p2Grams: it.grams,
      p2Marmitas: numMarmitasP2,
      recipeId: receita.id,
    }));
    setRows((prev) => [...prev, ...novasLinhas]);
    setReceitaIdsNaSemana((prev) =>
      prev.includes(receita.id) ? prev : [...prev, receita.id]
    );
    setMostrarPicker(false);
  }

  function removerReceitaDoGuia(recipeId: string) {
    setReceitaIdsNaSemana((prev) => prev.filter((r) => r !== recipeId));
  }

  // Aplica os mesmos updates a todas as linhas de um prato (grupo de receita).
  function atualizarGrupoReceita(recipeId: string, updates: Partial<FoodRow>) {
    setRows((prev) =>
      prev.map((r) => (r.recipeId === recipeId ? { ...r, ...updates } : r))
    );
  }

  // Remove o prato inteiro: as linhas do grupo + o id do guia de preparo.
  function removerReceita(recipeId: string) {
    setRows((prev) => prev.filter((r) => r.recipeId !== recipeId));
    setReceitaIdsNaSemana((prev) => prev.filter((r) => r !== recipeId));
  }

  // Escala o prato pelo ingrediente principal, no lado de uma pessoa: define o
  // novo g/marmita do principal e ajusta os secundários daquele lado pelo mesmo
  // fator (mantém a proporção). Em semana conjunta cada pessoa tem seu valor.
  function escalarPrincipal(
    recipeId: string,
    principalFoodId: string,
    novoGramas: number,
    pessoa: 1 | 2
  ) {
    const g = novoGramas || 0;
    if (g <= 0) return; // ignora valor vazio/zero (não zera o prato)
    setRows((prev) => {
      const principalAtual = prev.find(
        (r) => r.recipeId === recipeId && r.foodId === principalFoodId
      );
      const base =
        pessoa === 1 ? principalAtual?.p1Grams ?? 0 : principalAtual?.p2Grams ?? 0;
      if (base <= 0) return prev;
      const fator = g / base;
      return prev.map((r) => {
        if (r.recipeId !== recipeId) return r;
        const ehPrincipal = r.foodId === principalFoodId;
        if (pessoa === 1) {
          return { ...r, p1Grams: ehPrincipal ? g : r.p1Grams * fator };
        }
        return { ...r, p2Grams: ehPrincipal ? g : r.p2Grams * fator };
      });
    });
  }

  function removerLinha(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  function atualizarLinha(index: number, updates: Partial<FoodRow>) {
    const novasLinhas = [...rows];
    novasLinhas[index] = { ...novasLinhas[index], ...updates };
    setRows(novasLinhas);
  }

  function adicionarExtra() {
    const v = novoExtra.trim();
    if (!v) return;
    const jaExiste = extras.some(
      (e) => e.trim().toLowerCase() === v.toLowerCase()
    );
    if (!jaExiste) setExtras([...extras, v]);
    setNovoExtra("");
  }

  function removerExtra(index: number) {
    setExtras(extras.filter((_, i) => i !== index));
  }

  // Complementos que aparecem na lista de compras = base pessoal + extras.
  const complementos = [...basicos, ...extras];

  // Receitas desta semana (resolvidas da biblioteca) para o guia de preparo.
  const receitasDaSemana = receitaIdsNaSemana
    .map((rid) => receitasDisponiveis.find((r) => r.id === rid))
    .filter((r): r is RecipeWithIngredients => !!r);

  // Particiona as linhas em blocos preservando a ordem: um bloco por receita
  // (cartão de prato) e blocos avulsos para alimentos soltos.
  type Bloco =
    | { tipo: "receita"; recipeId: string; itens: ItemGrupo[] }
    | { tipo: "avulso"; idx: number };
  const blocos: Bloco[] = [];
  const grupoPorReceita: Record<string, ItemGrupo[]> = {};
  rows.forEach((r, idx) => {
    const item: ItemGrupo = {
      idx,
      foodId: r.foodId,
      p1On: r.p1On,
      p1Grams: r.p1Grams,
      p1Marmitas: r.p1Marmitas,
      p2On: r.p2On,
      p2Grams: r.p2Grams,
      p2Marmitas: r.p2Marmitas,
    };
    if (r.recipeId) {
      if (!grupoPorReceita[r.recipeId]) {
        grupoPorReceita[r.recipeId] = [];
        blocos.push({ tipo: "receita", recipeId: r.recipeId, itens: grupoPorReceita[r.recipeId] });
      }
      grupoPorReceita[r.recipeId].push(item);
    } else {
      blocos.push({ tipo: "avulso", idx });
    }
  });

  // Pessoas para a "montagem das marmitas": conjunta = duas pessoas (cada uma
  // com seus itens/marmitas); normal = só quem monta. Reusa os resumos já
  // calculados (WeekItemResult tem gramas cozidas/marmita e nº de marmitas).
  const pessoasMontagem: PessoaMontagem[] = isShared
    ? [
        {
          nome: meuNome,
          numMarmitas,
          itens: resumoEu?.items ?? [],
        },
        {
          nome: person2Name || "Outra pessoa",
          numMarmitas: numMarmitasP2,
          itens: resumoP2?.items ?? [],
        },
      ]
    : [
        {
          nome: meuNome,
          numMarmitas,
          itens: resumo?.items ?? [],
        },
      ];

  const inp =
    "rounded-[9px] border border-[#E2D7C4] bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
  const cardCls =
    "rounded-[20px] border border-[#EADFCD] bg-white p-5 dark:border-slate-800 dark:bg-slate-900";

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8 sm:py-10">
      <div>
        <h1 className="text-[clamp(26px,4vw,34px)] font-bold tracking-tight">
          Montar a semana
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">
          Diga o peso <strong className="text-slate-900 dark:text-slate-200">pronto</strong> por marmita — mostramos quanto comprar{" "}
          <strong className="text-slate-900 dark:text-slate-200">cru</strong>.
        </p>
      </div>

      {erro && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando alimentos…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr] lg:items-start">
          {/* ===================== COLUNA ESQUERDA ===================== */}
          <div className="flex flex-col gap-3.5">
            {/* Marmitas + toggle conjunta */}
            <div className={`${cardCls} flex flex-wrap items-center gap-x-[18px] gap-y-4`}>
              {/* Seletor principal — some no modo conjunta (cada pessoa tem o seu) */}
              {!isShared && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                    Quantas marmitas?
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNumMarmitas(Math.max(1, numMarmitas - 1))}
                      className="size-[38px] rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] text-xl text-slate-900 transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      aria-label="Menos uma marmita"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={marmitasStr}
                      onChange={(e) => {
                        setMarmitasStr(e.target.value);
                        const num = Number(e.target.value);
                        if (e.target.value !== "" && !isNaN(num) && num > 0) {
                          setNumMarmitas(num);
                        }
                      }}
                      onBlur={() => {
                        const num = Number(marmitasStr);
                        if (marmitasStr === "" || isNaN(num) || num < 1) {
                          setNumMarmitas(1);
                          setMarmitasStr("1");
                        } else {
                          setNumMarmitas(num);
                          setMarmitasStr(String(num));
                        }
                      }}
                      className="w-[70px] rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] py-2 text-center text-lg font-bold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <button
                      onClick={() => setNumMarmitas(numMarmitas + 1)}
                      className="size-[38px] rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] text-xl text-slate-900 transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      aria-label="Mais uma marmita"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <label className="ml-auto flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#E7DECD] bg-[#F7F2E9] px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => {
                    const ligado = e.target.checked;
                    setIsShared(ligado);
                    // Ao ligar, os pratos passam a valer para as duas pessoas.
                    if (ligado) {
                      setRows((prev) =>
                        prev.map((r) =>
                          r.recipeId ? { ...r, p2On: true } : r
                        )
                      );
                    }
                  }}
                  className="size-[17px] accent-emerald-600"
                />
                <span className="text-sm font-semibold">👥 Semana conjunta</span>
              </label>

              {/* Painel conjunta: parceiro + marmitas p2 */}
              {isShared && (
                <div className="w-full border-t border-[#EFE7D8] pt-3.5 dark:border-slate-800">
                  {linked && partnerName ? (
                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                      🔗 Compartilhando com <strong>{partnerName}</strong> — esta
                      semana também aparecerá na conta dela.
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Nome da outra pessoa
                      </label>
                      <input
                        type="text"
                        value={person2Name}
                        onChange={(e) => setPerson2Name(e.target.value)}
                        placeholder="Ex.: Namorada"
                        className="w-full max-w-xs rounded-xl border border-[#E2D7C4] bg-[#FCFAF5] px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Marmitas de {meuNome}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNumMarmitas(Math.max(1, numMarmitas - 1))}
                          className="size-[32px] rounded-lg border border-[#E2D7C4] bg-[#FCFAF5] text-lg text-slate-900 transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          aria-label={`Diminuir marmitas de ${meuNome}`}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={marmitasStr}
                          onChange={(e) => {
                            setMarmitasStr(e.target.value);
                            const num = Number(e.target.value);
                            if (e.target.value !== "" && !isNaN(num) && num > 0) {
                              setNumMarmitas(num);
                            }
                          }}
                          onBlur={() => {
                            const num = Number(marmitasStr);
                            if (marmitasStr === "" || isNaN(num) || num < 1) {
                              setNumMarmitas(1);
                              setMarmitasStr("1");
                            } else {
                              setNumMarmitas(num);
                              setMarmitasStr(String(num));
                            }
                          }}
                          className={`${inp} w-[60px] text-center`}
                        />
                        <button
                          type="button"
                          onClick={() => setNumMarmitas(numMarmitas + 1)}
                          className="size-[32px] rounded-lg border border-[#E2D7C4] bg-[#FCFAF5] text-lg text-slate-900 transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          aria-label={`Aumentar marmitas de ${meuNome}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Marmitas de {person2Name || "outra pessoa"}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNumMarmitasP2(Math.max(1, numMarmitasP2 - 1))}
                          className="size-[32px] rounded-lg border border-[#E2D7C4] bg-[#FCFAF5] text-lg text-slate-900 transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          aria-label={`Diminuir marmitas de ${person2Name || "outra pessoa"}`}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={marmitasP2Str}
                          onChange={(e) => {
                            setMarmitasP2Str(e.target.value);
                            const num = Number(e.target.value);
                            if (e.target.value !== "" && !isNaN(num) && num > 0) {
                              setNumMarmitasP2(num);
                            }
                          }}
                          onBlur={() => {
                            const num = Number(marmitasP2Str);
                            if (marmitasP2Str === "" || isNaN(num) || num < 1) {
                              setNumMarmitasP2(1);
                              setMarmitasP2Str("1");
                            } else {
                              setNumMarmitasP2(num);
                              setMarmitasP2Str(String(num));
                            }
                          }}
                          className={`${inp} w-[60px] text-center`}
                        />
                        <button
                          type="button"
                          onClick={() => setNumMarmitasP2(numMarmitasP2 + 1)}
                          className="size-[32px] rounded-lg border border-[#E2D7C4] bg-[#FCFAF5] text-lg text-slate-900 transition hover:brightness-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          aria-label={`Aumentar marmitas de ${person2Name || "outra pessoa"}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Alimentos da semana */}
            <div className={cardCls}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold [font-family:var(--font-display)]">
                  Alimentos da semana
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMostrarPicker(true)}
                    className="rounded-[10px] border border-emerald-600/40 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-[#E9F0E7] dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  >
                    + Receita
                  </button>
                  <button
                    onClick={adicionarLinha}
                    className="rounded-[10px] bg-[#E9F0E7] px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:brightness-95 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              {rows.length === 0 ? (
                <p className="py-6 text-center text-[14.5px] text-slate-400">
                  Nenhum alimento ainda. Clique em{" "}
                  <strong>+ Adicionar</strong> para começar.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {blocos.map((bloco) => {
                    if (bloco.tipo === "receita") {
                      return (
                        <ReceitaNaSemana
                          key={"r-" + bloco.recipeId}
                          recipeId={bloco.recipeId}
                          receita={receitasDisponiveis.find(
                            (r) => r.id === bloco.recipeId
                          )}
                          alimentos={alimentos}
                          itens={bloco.itens}
                          isShared={isShared}
                          meuNome={meuNome}
                          person2Name={person2Name}
                          inp={inp}
                          onAtualizarLinha={(i, updates) =>
                            atualizarLinha(i, updates)
                          }
                          onAtualizarGrupo={(updates) =>
                            atualizarGrupoReceita(bloco.recipeId, updates)
                          }
                          onEscalarPrincipal={(principalFoodId, novoGramas, pessoa) =>
                            escalarPrincipal(
                              bloco.recipeId,
                              principalFoodId,
                              novoGramas,
                              pessoa
                            )
                          }
                          onRemoverLinha={(i) => removerLinha(i)}
                          onRemover={() => removerReceita(bloco.recipeId)}
                        />
                      );
                    }
                    const idx = bloco.idx;
                    const linha = rows[idx];
                    const food = alimentos.find((f) => f.id === linha.foodId);
                    const resP1 =
                      food && linha.p1On && linha.p1Grams > 0
                        ? calculateWeekItem(food, linha.p1Grams, linha.p1Marmitas)
                        : null;
                    const resP2 =
                      food && isShared && linha.p2On && linha.p2Grams > 0
                        ? calculateWeekItem(food, linha.p2Grams, linha.p2Marmitas)
                        : null;

                    // Campos [g cozido/marmita] + [nº marmitas] de uma pessoa.
                    const campos = (
                      on: boolean,
                      grams: number,
                      marmitas: number,
                      setGrams: (v: number) => void,
                      setMarmitas: (v: number) => void
                    ) => (
                      <div className="flex items-end gap-3">
                        <div className="text-center">
                          <label className="mb-1 block text-[10.5px] font-semibold text-slate-400">
                            pronto/marmita
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={grams}
                              disabled={!on}
                              onChange={(e) => setGrams(Number(e.target.value))}
                              min="0"
                              step="1"
                              className={`${inp} w-[62px] text-center`}
                            />
                            <span className="text-xs font-semibold text-slate-400">
                              g
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <label className="mb-1 block text-[10.5px] font-semibold text-slate-400">
                            nº marmitas
                          </label>
                          <input
                            type="number"
                            value={marmitas}
                            disabled={!on}
                            onChange={(e) => setMarmitas(Number(e.target.value))}
                            min="1"
                            step="1"
                            className={`${inp} w-[62px] text-center`}
                          />
                        </div>
                      </div>
                    );

                    // Resumo ao vivo (cru + kcal + prot).
                    const mini = (r: WeekItemResult | null) =>
                      r ? (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-dashed border-[#E7DECD] pt-2.5 dark:border-slate-700">
                          <span className="text-[13.5px] font-bold text-emerald-700 dark:text-emerald-400">
                            {r.rawTotal.toFixed(0)} g crus no total
                          </span>
                          <span className="text-[#D6CDBB]">·</span>
                          <span className="text-[13px] text-slate-600 dark:text-slate-400">
                            {r.kcalTotal.toFixed(0)} kcal ·{" "}
                            {r.proteinTotal.toFixed(0)} g prot
                          </span>
                        </div>
                      ) : null;

                    return (
                      <div
                        key={idx}
                        className="rounded-[14px] border border-[#EADFCD] bg-[#FCFAF5] p-3 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="min-w-0 flex-1">
                            <AlimentoSelect
                              alimentos={alimentos}
                              value={linha.foodId}
                              onChange={(foodId) =>
                                atualizarLinha(idx, { foodId })
                              }
                            />
                          </div>
                          {!isShared &&
                            campos(
                              true,
                              linha.p1Grams,
                              linha.p1Marmitas,
                              (v) => atualizarLinha(idx, { p1Grams: v }),
                              (v) => atualizarLinha(idx, { p1Marmitas: v })
                            )}
                          <button
                            onClick={() => removerLinha(idx)}
                            title="Remover"
                            aria-label="Remover alimento"
                            className="self-center p-1 text-base text-rose-600 transition hover:opacity-70"
                          >
                            ✕
                          </button>
                        </div>

                        {!isShared ? (
                          food && mini(resP1)
                        ) : (
                          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {/* Pessoa 1 */}
                            <div className="rounded-[10px] border border-[#EADFCD] bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
                              <label className="flex items-center gap-2 text-xs font-semibold">
                                <input
                                  type="checkbox"
                                  checked={linha.p1On}
                                  onChange={(e) =>
                                    atualizarLinha(idx, {
                                      p1On: e.target.checked,
                                    })
                                  }
                                  className="size-4 accent-emerald-600"
                                />
                                {meuNome}
                              </label>
                              <div className="mt-2">
                                {campos(
                                  linha.p1On,
                                  linha.p1Grams,
                                  linha.p1Marmitas,
                                  (v) => atualizarLinha(idx, { p1Grams: v }),
                                  (v) => atualizarLinha(idx, { p1Marmitas: v })
                                )}
                              </div>
                              {food && linha.p1On && mini(resP1)}
                            </div>

                            {/* Pessoa 2 */}
                            <div className="rounded-[10px] border border-[#EADFCD] bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
                              <label className="flex items-center gap-2 text-xs font-semibold">
                                <input
                                  type="checkbox"
                                  checked={linha.p2On}
                                  onChange={(e) =>
                                    atualizarLinha(idx, {
                                      p2On: e.target.checked,
                                    })
                                  }
                                  className="size-4 accent-emerald-600"
                                />
                                {person2Name || "Outra pessoa"}
                              </label>
                              <div className="mt-2">
                                {campos(
                                  linha.p2On,
                                  linha.p2Grams,
                                  linha.p2Marmitas,
                                  (v) => atualizarLinha(idx, { p2Grams: v }),
                                  (v) => atualizarLinha(idx, { p2Marmitas: v })
                                )}
                              </div>
                              {food && linha.p2On && mini(resP2)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Complementos */}
            <div className={cardCls}>
              <h2 className="mb-1 text-base font-bold [font-family:var(--font-display)]">
                🧂 Complementos
              </h2>
              <p className="mb-3 text-[13px] text-slate-500 dark:text-slate-400">
                Temperos e básicos pra conferir na despensa (não entram no
                cálculo).
              </p>

              {/* Básicos pessoais */}
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Seus básicos (todas as semanas)
                  </p>
                  <Link
                    href="/inicio/configuracoes"
                    className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    editar em Ajustes
                  </Link>
                </div>
                {basicos.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Nenhum básico ainda — cadastre em Ajustes.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-[7px]">
                    {basicos.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center rounded-full border border-[#E7DECD] bg-[#F7F2E9] px-3 py-1.5 text-[13.5px] font-medium dark:border-slate-700 dark:bg-slate-800"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Extras desta semana */}
              {extras.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-[7px]">
                  {extras.map((ex, i) => (
                    <span
                      key={ex}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DECD] bg-[#F7F2E9] px-3 py-1.5 text-[13.5px] font-medium dark:border-slate-700 dark:bg-slate-800"
                    >
                      {ex}
                      <button
                        type="button"
                        onClick={() => removerExtra(i)}
                        aria-label={"Remover " + ex}
                        className="text-rose-600 hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novoExtra}
                  onChange={(e) => setNovoExtra(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarExtra();
                    }
                  }}
                  placeholder="Ex.: coentro, páprica…"
                  className="flex-1 rounded-xl border border-[#E2D7C4] bg-[#FCFAF5] px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={adicionarExtra}
                  className="shrink-0 rounded-xl bg-[#EFE7D8] px-4 text-sm font-semibold text-slate-600 transition hover:brightness-95 dark:bg-slate-800 dark:text-slate-300"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Guia de preparo das receitas usadas nesta semana */}
            {receitasDaSemana.length > 0 && (
              <GuiaPreparo
                receitas={receitasDaSemana}
                onRemover={removerReceitaDoGuia}
              />
            )}

            {/* Anotações */}
            <div className={cardCls}>
              <label className="block text-sm font-semibold">
                Anotações (temperos, dicas, etc.)
              </label>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Temperos e aditivos não entram no cálculo de nutrição.
              </p>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ex.: sal, alho, azeite..."
                className="mt-2 w-full rounded-xl border border-[#E2D7C4] bg-[#FCFAF5] px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                rows={3}
              />
            </div>
          </div>

          {/* ===================== COLUNA DIREITA (sticky) ===================== */}
          <div className="flex flex-col gap-3.5 lg:sticky lg:top-[78px]">
            {/* Lista de compras (total) */}
            <ListaCompras
              titulo={
                (tituloSemana || "Minha semana") + (isShared ? " (Total)" : "")
              }
              itens={resumo ? buildShoppingList(resumo) : []}
              complementos={complementos}
              storageKey={semanaId ?? undefined}
            />

            {/* Nutrição da semana */}
            {resumo && (
              <div className={cardCls}>
                <h2 className="mb-3.5 text-lg font-bold [font-family:var(--font-display)]">
                  Nutrição da semana{isShared ? " — Total" : ""}
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-[13px] bg-[#F7F2E9] px-3.5 py-3 dark:bg-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Total kcal
                    </p>
                    <p className="mt-1 text-2xl font-bold [font-family:var(--font-display)]">
                      {resumo.totalKcal.toFixed(0)}
                    </p>
                  </div>
                  <div className="rounded-[13px] bg-[#F7EDE7] px-3.5 py-3 dark:bg-rose-950/20">
                    <p className="text-xs font-semibold text-[#B06A4A] dark:text-rose-300">
                      Total proteína
                    </p>
                    <p className="mt-1 text-2xl font-bold text-rose-500 [font-family:var(--font-display)]">
                      {resumo.totalProtein.toFixed(0)} g
                    </p>
                  </div>
                  <div className="rounded-[13px] bg-[#F7F2E9] px-3.5 py-3 dark:bg-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Carboidrato
                    </p>
                    <p className="mt-1 text-xl font-bold [font-family:var(--font-display)]">
                      {resumo.totalCarb.toFixed(0)} g
                    </p>
                  </div>
                  <div className="rounded-[13px] bg-[#F7F2E9] px-3.5 py-3 dark:bg-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Gordura
                    </p>
                    <p className="mt-1 text-xl font-bold [font-family:var(--font-display)]">
                      {resumo.totalFat.toFixed(0)} g
                    </p>
                  </div>
                </div>

                <div className="mt-3 border-t border-[#EFE7D8] pt-3 dark:border-slate-800">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                    Média por marmita
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#E9F0E7] px-2.5 py-1.5 text-[13px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {resumo.avgKcalPerMarmita.toFixed(0)} kcal
                    </span>
                    <span className="rounded-full bg-[#F7E7DE] px-2.5 py-1.5 text-[13px] font-bold text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
                      {resumo.avgProteinPerMarmita.toFixed(0)} prot
                    </span>
                    <span className="rounded-full bg-[#F7F2E9] px-2.5 py-1.5 text-[13px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {resumo.avgCarbPerMarmita.toFixed(0)} carb
                    </span>
                    <span className="rounded-full bg-[#F7F2E9] px-2.5 py-1.5 text-[13px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {resumo.avgFatPerMarmita.toFixed(0)} gord
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Divisão por pessoa (conjunta) */}
            {resumo && isShared && (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <ResumoPessoa titulo={meuNome} resumo={resumoEu} />
                <ResumoPessoa
                  titulo={person2Name || "Outra pessoa"}
                  resumo={resumoP2}
                />
              </div>
            )}

            {/* Ações */}
            {linhas.length > 0 && (
              <div className="flex gap-2.5">
                <button
                  onClick={() => setMontando(true)}
                  className="flex-1 rounded-[13px] border border-emerald-600 bg-white px-4 py-3 font-semibold text-emerald-700 transition hover:bg-[#E9F0E7] dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                >
                  🍱 Montar agora
                </button>
                <button
                  onClick={() => setMostrando(true)}
                  className="flex-1 rounded-[13px] bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-600"
                >
                  💾 Salvar
                </button>
              </div>
            )}
          </div>

          {montando && (
            <MontagemMarmitas
              pessoas={pessoasMontagem}
              receitas={receitasDaSemana}
              onClose={() => setMontando(false)}
            />
          )}

          {mostrarPicker && (
            <ReceitaPicker
              receitas={receitasDisponiveis}
              alimentos={alimentos}
              onEscolher={adicionarReceita}
              onClose={() => setMostrarPicker(false)}
            />
          )}

          {mostrando && (
            <SemanaSalvaModal
              semanaId={semanaId}
              tituloInicial={tituloSemana}
              linhas={linhas}
              numMarmitas={numMarmitas}
              notas={notas}
              extras={extras}
              isShared={isShared}
              person2Name={person2Name}
              numMarmitasP2={numMarmitasP2}
              recipeIds={receitaIdsNaSemana}
              onClose={() => setMostrando(false)}
              onSuccess={() => {
                setMostrando(false);
                // Limpa o formulário após salvar com sucesso
                setRows([]);
                setNotas("");
                setExtras([]);
                setTituloSemana("");
                setNumMarmitas(7);
                setIsShared(false);
                setPerson2Name("Namorada");
                setNumMarmitasP2(7);
                setReceitaIdsNaSemana([]);
              }}
            />
          )}
        </div>
      )}
    </main>
  );
}
