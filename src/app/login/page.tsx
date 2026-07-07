"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type Modo = "entrar" | "cadastrar";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const configurado = hasSupabaseEnv();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);

    if (!configurado) {
      setErro(
        "O login ainda não foi configurado (faltam as chaves do Supabase). Já já fica pronto."
      );
      return;
    }

    setCarregando(true);
    const supabase = createClient();

    try {
      if (modo === "cadastrar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { display_name: nome.trim() } },
        });
        if (error) throw error;

        // Se a confirmação por e-mail estiver ligada, ainda não há sessão.
        if (!data.session) {
          setAviso(
            "Conta criada! Confirme pelo e-mail que enviamos e depois entre."
          );
          setModo("entrar");
          setCarregando(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
      }

      // Sessão criada: entra na área privada.
      router.push("/inicio");
      router.refresh();
    } catch (err: unknown) {
      setErro(traduzErro(err));
      setCarregando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <span className="text-4xl">🍱</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Planejador de Marmitas
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {modo === "entrar" ? "Entre na sua conta" : "Crie sua conta"}
        </p>
      </div>

      {!configurado && (
        <p className="mb-4 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          ⚙️ O login está sendo configurado. Em instantes esta tela funciona.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {modo === "cadastrar" && (
          <div>
            <label htmlFor="nome" className="mb-1 block text-sm font-medium">
              Seu nome
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900"
              placeholder="Ex.: Maria"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900"
            placeholder="voce@email.com"
          />
        </div>

        <div>
          <label htmlFor="senha" className="mb-1 block text-sm font-medium">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={6}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Mínimo de 6 caracteres"
          />
        </div>

        {erro && (
          <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {erro}
          </p>
        )}
        {aviso && (
          <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {carregando
            ? "Aguarde…"
            : modo === "entrar"
              ? "Entrar"
              : "Criar conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {modo === "entrar" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
        <button
          type="button"
          onClick={() => {
            setModo(modo === "entrar" ? "cadastrar" : "entrar");
            setErro(null);
            setAviso(null);
          }}
          className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {modo === "entrar" ? "Cadastre-se" : "Entrar"}
        </button>
      </p>
    </main>
  );
}

function traduzErro(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (msg.includes("already registered") || msg.includes("already been registered"))
    return "Este e-mail já tem uma conta. Tente entrar.";
  if (msg.includes("Email not confirmed"))
    return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  if (msg.toLowerCase().includes("password"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  return "Algo deu errado. Tente novamente em instantes.";
}
