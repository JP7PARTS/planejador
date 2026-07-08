import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import SignOutButton from "./sign-out-button";

export const dynamic = "force-dynamic";

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

  // Busca o perfil para ver se o compartilhamento está ativado
  const { data: profile } = await supabase
    .from("profiles")
    .select("share_consent")
    .eq("id", user.id)
    .single();

  const hasSharing = profile?.share_consent ?? false;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-10 sm:py-16">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Olá, bem-vindo(a)
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{nome} 👋</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-xl border border-slate-200 bg-white/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="font-semibold">Você está logado(a) ✅</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Sua conta é <strong>{user.email}</strong>. A partir daqui, tudo o que
          você criar (alimentos, semanas, marmitas) fica <strong>só seu</strong>
          — a outra pessoa da casa terá os dados dela, totalmente separados.
        </p>
      </section>

      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
          <h2 className="font-semibold">Banco de Alimentos</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Seus alimentos estão prontos — a Tabela TACO já foi carregada! Veja
            a lista com toda a nutrição (cru) e fatores de cocção.
          </p>
          <Link
            href="/inicio/alimentos"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Ver Alimentos →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
          <h2 className="font-semibold">Montar a Semana</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Defina quantas marmitas fará, especifique cada alimento (gramas
            cozidas por marmita), e a app calcula quanto você precisa fazer/comprar
            em gramas CRU. Veja também a nutrição total da semana.
          </p>
          <Link
            href="/inicio/semana"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Montar a Semana →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
          <h2 className="font-semibold">Semanas Salvas</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Veja todas as semanas que você montou, abra para editar, duplique uma
            como base para a próxima, ou marque suas favoritas.
          </p>
          <Link
            href="/inicio/semanas"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Ver Semanas →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
          <h2 className="font-semibold">⚙️ Configurações</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Gerencie seu perfil, veja seu ID da Família, e ative compartilhamento
            com seu casal para ver os totais combinados.
          </p>
          <Link
            href="/inicio/configuracoes"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Configurações →
          </Link>
        </div>

        {hasSharing && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
            <h2 className="font-semibold text-emerald-900 dark:text-emerald-100">
              📊 Totais do Casal
            </h2>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              Veja a lista de compras combinada e a nutrição agregada de você e
              seu casal. Todos os dados estão consolidados em um único lugar.
            </p>
            <Link
              href="/inicio/consolidacao"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Ver Totais →
            </Link>
          </div>
        )}

      </section>
    </main>
  );
}
