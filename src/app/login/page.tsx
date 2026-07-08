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

  const inputClass =
    "w-full rounded-xl border border-[#E2D7C4] bg-[#FCFAF5] px-3.5 py-3 text-[15px] text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-10">
      <div className="w-full max-w-[400px]">
        {/* Cabeçalho */}
        <div className="mb-[26px] text-center">
          <span className="mb-3.5 inline-grid size-[60px] place-items-center rounded-[18px] bg-emerald-600 text-3xl text-white">
            🍱
          </span>
          <h1 className="text-[28px] font-bold tracking-tight">
            Planejador de Marmitas
          </h1>
          <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-400">
            {modo === "entrar"
              ? "Entre para planejar sua semana"
              : "Crie sua conta e comece agora"}
          </p>
        </div>

        {!configurado && (
          <p className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            ⚙️ O login está sendo configurado. Em instantes esta tela funciona.
          </p>
        )}

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-[22px] border border-[#EADFCD] bg-white p-6 shadow-[0_24px_50px_-34px_rgba(38,34,28,0.6)] dark:border-slate-800 dark:bg-slate-900"
        >
          {modo === "cadastrar" && (
            <>
              <label
                htmlFor="nome"
                className="mb-1.5 block text-[13px] font-semibold"
              >
                Seu nome
              </label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="name"
                className={`${inputClass} mb-3.5`}
                placeholder="Ex.: Maria"
              />
            </>
          )}

          <label
            htmlFor="email"
            className="mb-1.5 block text-[13px] font-semibold"
          >
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
            className={`${inputClass} mb-3.5`}
            placeholder="voce@email.com"
          />

          <label
            htmlFor="senha"
            className="mb-1.5 block text-[13px] font-semibold"
          >
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
            className={`${inputClass} mb-5`}
            placeholder="••••••••"
          />

          {erro && (
            <p className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {erro}
            </p>
          )}
          {aviso && (
            <p className="mb-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
              {aviso}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {carregando
              ? "Aguarde…"
              : modo === "entrar"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>

        <p className="mt-[18px] text-center text-sm text-slate-500 dark:text-slate-400">
          {modo === "entrar" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
          <button
            type="button"
            onClick={() => {
              setModo(modo === "entrar" ? "cadastrar" : "entrar");
              setErro(null);
              setAviso(null);
            }}
            className="font-bold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {modo === "entrar" ? "Cadastre-se" : "Entrar"}
          </button>
        </p>
      </div>
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
