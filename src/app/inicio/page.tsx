import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { calculateWeekSummary, type WeekItem } from "@/lib/calc";
import type { Food, Week, WeekItemDB } from "@/lib/types";

export const dynamic = "force-dynamic";

// Saudação de acordo com o horário no Brasil.
function saudacao(): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date())
  );
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function InicioPage() {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Nome escolhido no cadastro (fica nos metadados do usuário).
  const nome =
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "você";

  // Perfil: compartilhamento com o casal ativado?
  const { data: profile } = await supabase
    .from("profiles")
    .select("share_consent")
    .eq("id", user.id)
    .single();
  const hasSharing = profile?.share_consent ?? false;

  // Alimentos no banco (só a contagem).
  const { count: foodsCount } = await supabase
    .from("foods")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Semana mais recente do usuário + resumo nutricional dela.
  const { data: weeks } = await supabase
    .from("weeks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const semanaAtual: Week | null = weeks?.[0] ?? null;

  let totalMarmitas = 0;
  let kcalPorMarmita: number | null = null;
  let proteinaPorMarmita: number | null = null;

  if (semanaAtual) {
    totalMarmitas =
      semanaAtual.num_marmitas +
      (semanaAtual.is_shared ? semanaAtual.num_marmitas_p2 : 0);

    const [{ data: itens }, { data: foods }] = await Promise.all([
      supabase
        .from("week_items")
        .select("*")
        .eq("week_id", semanaAtual.id),
      supabase.from("foods").select("*").eq("user_id", user.id),
    ]);

    if (itens && itens.length > 0 && foods) {
      const foodsMap: Record<string, Food> = {};
      (foods as Food[]).forEach((f) => {
        foodsMap[f.id] = f;
      });

      const weekItems: WeekItem[] = (itens as WeekItemDB[]).map((it) => ({
        foodId: it.food_id,
        cookedGramsPerMarmita: it.cooked_grams_per_marmita,
        numMarmitas: it.num_marmitas,
      }));

      const resumo = calculateWeekSummary(
        weekItems,
        foodsMap,
        totalMarmitas || semanaAtual.num_marmitas
      );

      if (resumo.items.length > 0) {
        kcalPorMarmita = Math.round(resumo.avgKcalPerMarmita);
        proteinaPorMarmita = Math.round(resumo.avgProteinPerMarmita);
      }
    }
  }

  const atalhos = [
    {
      emoji: "🍱",
      titulo: "Montar a semana",
      desc: "Defina as marmitas e os alimentos — o app calcula o cru, as calorias e os macros na hora.",
      href: "/inicio/semana",
      cta: "Começar →",
      corCta: "text-emerald-700 dark:text-emerald-400",
      corTile: "bg-emerald-600/10",
    },
    {
      emoji: "🥕",
      titulo: "Banco de alimentos",
      desc: "Tabela TACO já carregada. Veja a nutrição por 100g cru e os fatores de cocção.",
      href: "/inicio/alimentos",
      cta: "Ver alimentos →",
      corCta: "text-amber-600 dark:text-amber-400",
      corTile: "bg-amber-500/15",
    },
    {
      emoji: "📚",
      titulo: "Semanas salvas",
      desc: "Abra semanas anteriores, duplique como base para a próxima ou marque favoritas.",
      href: "/inicio/semanas",
      cta: "Ver semanas →",
      corCta: "text-rose-600 dark:text-rose-400",
      corTile: "bg-rose-500/10",
    },
    {
      emoji: "⚙️",
      titulo: "Ajustes",
      desc: "Perfil, ID da família e compartilhamento com o casal para ver os totais combinados.",
      href: "/inicio/configuracoes",
      cta: "Abrir ajustes →",
      corCta: "text-slate-600 dark:text-slate-300",
      corTile: "bg-slate-500/10",
    },
  ];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-8 sm:py-10">
      {/* Saudação */}
      <section>
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {saudacao()}, hora de cozinhar 🧑‍🍳
        </p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
          Oi, {nome}.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Planeje as marmitas da semana e descubra exatamente{" "}
          <strong>quanto comprar de alimento cru</strong> a partir do peso
          pronto que você quer comer.
        </p>
      </section>

      {/* Estatísticas */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-emerald-700 p-5 text-white shadow-sm">
          <p className="text-sm font-medium text-emerald-100">Semana atual</p>
          {semanaAtual ? (
            <p className="mt-1 text-3xl font-bold">
              {totalMarmitas}{" "}
              <span className="text-base font-semibold text-emerald-100">
                marmitas
              </span>
            </p>
          ) : (
            <p className="mt-1 text-base font-semibold text-emerald-100">
              Nenhuma ainda — bora montar!
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Kcal / marmita
          </p>
          <p className="mt-1 text-3xl font-bold">
            {kcalPorMarmita ?? "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Proteína / marmita
          </p>
          <p className="mt-1 text-3xl font-bold text-rose-500">
            {proteinaPorMarmita !== null ? `${proteinaPorMarmita} g` : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Alimentos no banco
          </p>
          <p className="mt-1 text-3xl font-bold">{foodsCount ?? 0}</p>
        </div>
      </section>

      {/* Atalhos */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {atalhos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-32px_rgba(38,34,28,0.55)] transition hover:border-emerald-600/40 dark:border-slate-800 dark:bg-slate-900"
          >
            <span
              className={`grid size-12 place-items-center rounded-2xl text-2xl ${a.corTile}`}
            >
              {a.emoji}
            </span>
            <h3 className="mt-4 text-xl font-bold tracking-tight">
              {a.titulo}
            </h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
              {a.desc}
            </p>
            <span
              className={`mt-3 inline-flex text-sm font-semibold ${a.corCta}`}
            >
              {a.cta}
            </span>
          </Link>
        ))}

        {hasSharing && (
          <Link
            href="/inicio/consolidacao"
            className="group rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-[0_18px_40px_-32px_rgba(38,34,28,0.55)] transition hover:border-emerald-600/50 dark:border-emerald-900 dark:bg-emerald-950/20 sm:col-span-2"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-600/15 text-2xl">
              📊
            </span>
            <h3 className="mt-4 text-xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
              Totais do casal
            </h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-emerald-800 dark:text-emerald-200">
              Lista de compras combinada e nutrição agregada de vocês dois, em
              um único lugar.
            </p>
            <span className="mt-3 inline-flex text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Ver totais →
            </span>
          </Link>
        )}
      </section>

      <footer className="mt-auto pt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Planejador de Marmitas · feito pra quem cozinha de verdade 🍳
      </footer>
    </main>
  );
}
