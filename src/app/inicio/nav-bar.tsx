"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./sign-out-button";
import ThemeToggle from "../theme-toggle";

const links = [
  { href: "/inicio", label: "Início" },
  { href: "/inicio/alimentos", label: "Alimentos" },
  { href: "/inicio/receitas", label: "Receitas" },
  { href: "/inicio/refeicoes", label: "Refeições" },
  { href: "/inicio/semana", label: "Montar" },
  { href: "/inicio/semanas", label: "Semanas" },
  { href: "/inicio/configuracoes", label: "Ajustes" },
];

function isActive(pathname: string, href: string) {
  if (href === "/inicio") return pathname === "/inicio";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
        {/* Logo */}
        <Link href="/inicio" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-600/15 text-lg">
            🍱
          </span>
          <span className="text-lg font-bold tracking-tight [font-family:var(--font-display)]">
            Marmita
          </span>
        </Link>

        {/* Links (em telas pequenas quebram para a linha de baixo, com scroll) */}
        <nav className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-0.5 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:justify-center sm:pb-0">
          {links.map((l) => {
            const ativo = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={ativo ? "page" : undefined}
                className={
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition " +
                  (ativo
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-emerald-600/10 hover:text-emerald-800 dark:text-slate-300 dark:hover:text-emerald-300")
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Ações */}
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Link
            href="/inicio/semana"
            className="shrink-0 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
          >
            + Nova semana
          </Link>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
