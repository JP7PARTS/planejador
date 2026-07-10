"use client";

import { useCallback, useEffect, useState } from "react";
import { Food, RecipeWithIngredients } from "@/lib/types";
import { listRecipes } from "@/lib/api/recipes";
import { createClient } from "@/lib/supabase/client";
import ReceitasList from "./receitas-list";

export default function ReceitasPage() {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [alimentos, setAlimentos] = useState<Food[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);

      const supabase = createClient();
      const [{ data: foods, error: foodsErr }, recs] = await Promise.all([
        supabase.from("foods").select("*").order("category").order("name"),
        listRecipes(),
      ]);

      if (foodsErr) throw foodsErr;
      setAlimentos(foods || []);
      setRecipes(recs);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8 sm:py-10">
      {erro && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando…
        </p>
      ) : (
        <ReceitasList
          recipes={recipes}
          alimentos={alimentos}
          onRefresh={carregar}
        />
      )}
    </main>
  );
}
