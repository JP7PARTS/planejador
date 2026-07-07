import Link from "next/link";

const etapas = [
  { n: 1, titulo: "Esqueleto no ar", desc: "Página inicial publicada na Vercel.", pronto: true },
  { n: 2, titulo: "Login", desc: "Contas separadas com Supabase Auth.", pronto: true },
  { n: 3, titulo: "Banco + TACO", desc: "Alimentos pré-populados da Tabela TACO.", pronto: true },
  { n: 4, titulo: "Alimentos", desc: "Criar, editar e excluir seus alimentos.", pronto: true },
  { n: 5, titulo: "Métodos de preparo", desc: "Fator de cocção (FC) por alimento.", pronto: true },
  { n: 6, titulo: "Montar a semana", desc: "Motor de cálculo de cru, calorias e macros.", pronto: true },
  { n: 7, titulo: "Salvar semanas", desc: "Salvar, abrir, duplicar e favoritar cardápios.", pronto: false },
  { n: 8, titulo: "Consolidar o casal", desc: "Somar os totais (só com consentimento).", pronto: false },
  { n: 9, titulo: "Ajuste mobile", desc: "Deixar tudo redondo no celular.", pronto: false },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-10 sm:py-16">
      <header className="mb-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          🍱 MVP em construção
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Planejador de Marmitas
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Planeje as marmitas da semana, calcule calorias e macronutrientes e
          descubra quanto comprar de alimento <strong>cru</strong> a partir do
          peso <strong>pronto</strong> que você quer comer.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-emerald-700"
        >
          Entrar / Criar conta →
        </Link>
      </header>

      <section aria-labelledby="etapas-titulo">
        <h2
          id="etapas-titulo"
          className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Etapas do projeto
        </h2>
        <ol className="space-y-2">
          {etapas.map((e) => (
            <li
              key={e.n}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40"
            >
              <span
                className={
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
                  (e.pronto
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300")
                }
              >
                {e.pronto ? "✓" : e.n}
              </span>
              <div>
                <p className="font-medium">{e.titulo}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {e.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-auto pt-10 text-center text-xs text-slate-400">
        Etapas 1-6 concluídas — você pode começar a montar suas semanas! 🚀
      </footer>
    </main>
  );
}
