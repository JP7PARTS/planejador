"use client";

import { useCallback, useEffect, useState } from "react";
import { Food } from "@/lib/types";
import AlimentosList from "./alimentos-list";
import { createClient } from "@/lib/supabase/client";

export default function AlimentosPage() {
  const [alimentos, setAlimentos] = useState<Food[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarAlimentos();
  }, [carregarAlimentos]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Banco de Alimentos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {alimentos.length} alimentos
          </p>
        </div>
      </header>

      {erro && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">Carregando…</p>
      ) : (
        <AlimentosList alimentos={alimentos} onRefresh={carregarAlimentos} />
      )}
    </main>
  );
}
