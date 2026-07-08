import Link from "next/link";

const recursos = [
  {
    emoji: "🍱",
    titulo: "Do pronto ao cru",
    desc: "Diga o peso cozido que quer comer — calculamos quanto comprar de alimento cru, por marmita e no total.",
  },
  {
    emoji: "🔥",
    titulo: "Calorias e macros",
    desc: "Cada marmita e a semana inteira com kcal, proteína, carbo e gordura, a partir da Tabela TACO.",
  },
  {
    emoji: "🛒",
    titulo: "Lista de compras",
    desc: "Agrupada por seção do mercado, com checklist e botão de compartilhar no WhatsApp.",
  },
  {
    emoji: "👥",
    titulo: "Feito pra casal",
    desc: "Dividam uma semana e vejam os totais combinados — só com o consentimento dos dois.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-10 sm:py-16">
      {/* Hero */}
      <section className="flex flex-col items-start">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          🥗 Planeje a semana em minutos
        </span>

        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.03] tracking-tight sm:text-6xl">
          Suas marmitas da semana,{" "}
          <span className="text-emerald-700 dark:text-emerald-400">
            sem chute
          </span>
          .
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          Escolha os alimentos e o peso <strong>pronto</strong> que você quer
          comer. A gente calcula quanto comprar de <strong>cru</strong>, as
          calorias, os macros e monta sua lista de compras.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Entrar / Criar conta →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            Ver como funciona
          </Link>
        </div>
      </section>

      {/* Recursos */}
      <section className="mt-14 grid grid-cols-1 gap-4 sm:mt-20 sm:grid-cols-2">
        {recursos.map((r) => (
          <div
            key={r.titulo}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-32px_rgba(38,34,28,0.55)] dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-600/10 text-2xl">
              {r.emoji}
            </span>
            <h3 className="mt-4 text-xl font-bold tracking-tight">{r.titulo}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
              {r.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Chamada final */}
      <section className="mt-14 flex flex-col items-start gap-4 rounded-3xl bg-emerald-600 px-7 py-9 text-white sm:mt-16 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Bora montar a primeira semana?
          </h2>
          <p className="mt-1 text-emerald-50/90">
            Grátis, roda no celular e no computador.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          Começar agora →
        </Link>
      </section>

      <footer className="mt-auto pt-12 text-center text-xs text-slate-400 dark:text-slate-500">
        Planejador de Marmitas · feito pra quem cozinha de verdade 🍳
      </footer>
    </main>
  );
}
