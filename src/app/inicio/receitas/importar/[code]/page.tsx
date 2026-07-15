"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getSharedRecipe,
  importSharedRecipe,
  SharedRecipePreview,
} from "@/lib/api/recipes";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export default function ImportarReceitaPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const router = useRouter();

  const [logado, setLogado] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<SharedRecipePreview | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLogado(false);
        return;
      }
      setLogado(true);
      const data = await getSharedRecipe(code);
      setPreview(data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, [code]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function importar() {
    setImportando(true);
    setErro(null);
    try {
      await importSharedRecipe(code);
      router.push("/inicio/receitas");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao importar");
      setImportando(false);
    }
  }

  // Agrupa ingredientes por choice_group para exibir escolhas juntas.
  const grupos = (() => {
    if (!preview) return [];
    const fixos = preview.ingredients.filter((i) => i.choice_group == null);
    const escolhasMap = new Map<number, typeof preview.ingredients>();
    preview.ingredients.forEach((i) => {
      if (i.choice_group == null) return;
      const arr = escolhasMap.get(i.choice_group) ?? [];
      arr.push(i);
      escolhasMap.set(i.choice_group, arr);
    });
    return { fixos, escolhas: Array.from(escolhasMap.values()) };
  })() as {
    fixos: SharedRecipePreview["ingredients"];
    escolhas: SharedRecipePreview["ingredients"][];
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8 sm:py-10">
      <div>
        <Link
          href="/inicio/receitas"
          className="text-[13.5px] font-semibold text-emerald-700 transition hover:underline dark:text-emerald-400"
        >
          ← Receitas
        </Link>
      </div>

      {erro && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando…
        </p>
      ) : logado === false ? (
        <div className="rounded-[20px] border border-[#EADFCD] bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[15px] text-slate-600 dark:text-slate-300">
            Entre na sua conta para adicionar esta receita.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-emerald-700"
          >
            Fazer login
          </Link>
        </div>
      ) : !preview ? null : (
        <>
          <header>
            <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
              📥 Receita compartilhada por {preview.owner_name}
            </p>
            <h1 className="mt-1 text-[clamp(24px,4vw,32px)] font-bold tracking-tight [font-family:var(--font-display)]">
              {preview.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
              {preview.total_time_min != null && (
                <span className="rounded-full bg-[#F7F2E9] px-2.5 py-1 font-medium dark:bg-slate-800">
                  ⏱️ {preview.total_time_min} min
                </span>
              )}
              {preview.pressure_time_min != null && (
                <span className="rounded-full bg-[#F7F2E9] px-2.5 py-1 font-medium dark:bg-slate-800">
                  ♨️ {preview.pressure_time_min} min pressão
                </span>
              )}
              {preview.yield_marmitas != null && (
                <span className="rounded-full bg-[#F7F2E9] px-2.5 py-1 font-medium dark:bg-slate-800">
                  🍱 rende {fmt(preview.yield_marmitas)}
                </span>
              )}
            </div>
          </header>

          <div className="rounded-[16px] border border-[#EADFCD] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-[15px] font-bold">Ingredientes</h2>
            <ul className="flex flex-col gap-1 text-[14px] text-slate-700 dark:text-slate-300">
              {grupos.fixos.map((i, idx) => (
                <li key={"f" + idx} className="flex justify-between gap-2">
                  <span>
                    {i.is_principal && (
                      <span className="mr-1 text-amber-500">⭐</span>
                    )}
                    {i.food.name}
                  </span>
                  <span className="text-slate-400">
                    {fmt(i.cooked_grams_per_marmita)} g/marmita
                  </span>
                </li>
              ))}
              {grupos.escolhas.map((opcoes, idx) => (
                <li key={"e" + idx} className="flex justify-between gap-2">
                  <span>
                    {opcoes[0]?.is_principal && (
                      <span className="mr-1 text-amber-500">⭐</span>
                    )}
                    <strong>{opcoes[0]?.choice_label || "Escolha"}:</strong>{" "}
                    {opcoes.map((o) => o.food.name).join(" / ")}
                  </span>
                  <span className="text-slate-400">
                    {fmt(opcoes[0]?.cooked_grams_per_marmita ?? 0)} g/marmita
                  </span>
                </li>
              ))}
            </ul>

            {preview.steps.length > 0 && (
              <>
                <h2 className="mb-2 mt-4 text-[15px] font-bold">Modo de preparo</h2>
                <ol className="flex list-decimal flex-col gap-1 pl-5 text-[14px] text-slate-700 dark:text-slate-300">
                  {preview.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </>
            )}
          </div>

          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
            Ao adicionar, a receita entra na sua conta e os alimentos que você
            ainda não tem são criados automaticamente.
          </p>

          <button
            onClick={importar}
            disabled={importando}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {importando ? "Adicionando…" : "➕ Adicionar à minha conta"}
          </button>
        </>
      )}
    </main>
  );
}
