import { createClient } from "@/lib/supabase/server";
import { Food } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORIAS = {
  carbo: { label: "Carboidratos", cor: "amber" },
  proteina: { label: "Proteínas", cor: "rose" },
  vegetal: { label: "Vegetais", cor: "emerald" },
  fruta: { label: "Frutas", cor: "orange" },
  outro: { label: "Outros", cor: "slate" },
} as const;

export default async function AlimentosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: alimentos, error } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .order("category")
    .order("name");

  const temErro = error && error.code !== "PGRST116";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
      <header>
        <h1 className="text-2xl font-bold">Banco de Alimentos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {alimentos?.length ?? 0} alimentos pré-carregados da Tabela TACO
        </p>
      </header>

      {temErro && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          Erro ao carregar alimentos. Tente atualizar a página.
        </div>
      )}

      {!alimentos || alimentos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum alimento encontrado. Tente atualizar em alguns segundos.
        </p>
      ) : (
        <div className="space-y-8">
          {Object.entries(CATEGORIAS).map(([categoria, { label, cor }]) => {
            const porCategoria = (alimentos as Food[]).filter(
              (f) => f.category === categoria
            );
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
                          FC: {alimento.fc.toFixed(2)} • Cru
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">
                            kcal
                          </p>
                          <p className="font-semibold">
                            {alimento.kcal_per_100g.toFixed(0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">
                            prot
                          </p>
                          <p className="font-semibold">
                            {alimento.protein_g_per_100g.toFixed(1)}g
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">
                            carb
                          </p>
                          <p className="font-semibold">
                            {alimento.carb_g_per_100g.toFixed(1)}g
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">
                            gord
                          </p>
                          <p className="font-semibold">
                            {alimento.fat_g_per_100g.toFixed(1)}g
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
