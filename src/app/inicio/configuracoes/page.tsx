"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { linkHousehold, unlinkHousehold } from "@/lib/api/household";

interface Profile {
  id: string;
  display_name: string;
  household_id: string;
  share_consent: boolean;
  staples: string[];
}

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [targetHouseholdId, setTargetHouseholdId] = useState("");
  const [ativando, setAtivando] = useState(false);
  const [desativando, setDesativando] = useState(false);

  // Básicos (temperos que aparecem em toda semana).
  const [novoBasico, setNovoBasico] = useState("");
  const [salvandoBasicos, setSalvandoBasicos] = useState(false);

  const carregarPerfil = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, household_id, share_consent, staples")
        .single();

      if (error) throw error;
      setProfile({ ...data, staples: data.staples ?? [] });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  async function handleAtivareCompartilhamento() {
    if (!targetHouseholdId.trim()) {
      setErro("Cole o código do seu parceiro/parceira");
      return;
    }

    setAtivando(true);
    setErro(null);
    setSucesso(null);

    try {
      await linkHousehold(targetHouseholdId.trim());
      setSucesso("Compartilhamento ativado com sucesso!");
      setTargetHouseholdId("");
      await carregarPerfil();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao ativar");
    } finally {
      setAtivando(false);
    }
  }

  async function handleDesativarCompartilhamento() {
    if (
      !window.confirm(
        "Tem certeza que quer desativar o compartilhamento com seu casal?"
      )
    ) {
      return;
    }

    setDesativando(true);
    setErro(null);
    setSucesso(null);

    try {
      await unlinkHousehold();
      setSucesso("Compartilhamento desativado!");
      await carregarPerfil();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao desativar");
    } finally {
      setDesativando(false);
    }
  }

  // Salva a lista de básicos no perfil (Supabase, RLS libera a própria linha).
  async function salvarBasicos(novaLista: string[]) {
    if (!profile) return;
    setSalvandoBasicos(true);
    setErro(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ staples: novaLista })
        .eq("id", profile.id);
      if (error) throw error;
      setProfile({ ...profile, staples: novaLista });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar básicos");
    } finally {
      setSalvandoBasicos(false);
    }
  }

  function adicionarBasico() {
    const v = novoBasico.trim();
    if (!v || !profile) return;
    const jaExiste = profile.staples.some(
      (s) => s.trim().toLowerCase() === v.toLowerCase()
    );
    setNovoBasico("");
    if (jaExiste) return;
    salvarBasicos([...profile.staples, v]);
  }

  function removerBasico(index: number) {
    if (!profile) return;
    salvarBasicos(profile.staples.filter((_, i) => i !== index));
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerencie seu perfil e compartilhamento com o casal
          </p>
        </div>
      </header>

      {erro && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          {sucesso}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando…
        </p>
      ) : profile ? (
        <>
          {/* Perfil */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold">Seu Perfil</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Nome</p>
                <p className="font-medium">{profile.display_name || "Sem nome"}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">
                  Seu Código (compartilhe com seu parceiro)
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-800">
                    {profile.id}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(profile.id);
                      setSucesso("Código copiado!");
                      setTimeout(() => setSucesso(null), 3000);
                    }}
                    className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-slate-700"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Meus temperos & básicos */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold">🧂 Meus temperos & básicos</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Itens que você sempre usa pra cozinhar (sal, alho, azeite, cebola,
              tomate…). Eles aparecem como <strong>complementos</strong> na lista
              de compras de toda semana, com checkbox pra você conferir o que já
              tem em casa. Não entram no cálculo de nutrição.
            </p>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={novoBasico}
                onChange={(e) => setNovoBasico(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarBasico();
                  }
                }}
                placeholder="Ex.: sal, alho, azeite…"
                className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                onClick={adicionarBasico}
                disabled={salvandoBasicos}
                className="shrink-0 rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                + Adicionar
              </button>
            </div>

            {profile.staples.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Nenhum básico cadastrado ainda.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.staples.map((s, i) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {s}
                    <button
                      onClick={() => removerBasico(i)}
                      disabled={salvandoBasicos}
                      aria-label={"Remover " + s}
                      className="text-slate-400 hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status de Compartilhamento */}
          {profile.share_consent ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
              <h2 className="font-semibold text-emerald-900 dark:text-emerald-100">
                ✅ Compartilhamento Ativo
              </h2>
              <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
                Você está compartilhando seus dados de marmitas com seu casal.
              </p>
              <button
                onClick={handleDesativarCompartilhamento}
                disabled={desativando}
                className="mt-3 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {desativando ? "Desativando…" : "Desativar Compartilhamento"}
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">Ativar Compartilhamento com Casal</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Compartilhe seus dados de marmitas com seu parceiro/parceira para
                ver os totais combinados.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium">
                    Código do seu parceiro/parceira *
                  </label>
                  <input
                    type="text"
                    value={targetHouseholdId}
                    onChange={(e) => setTargetHouseholdId(e.target.value)}
                    placeholder="Cole o código que seu parceiro compartilhou"
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Peça para seu parceiro abrir Configurações e copiar o "Seu
                    Código"
                  </p>
                </div>

                <button
                  onClick={handleAtivareCompartilhamento}
                  disabled={ativando}
                  className="rounded bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {ativando ? "Ativando…" : "Ativar Compartilhamento"}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
            <p className="font-medium">ℹ️ Como funciona:</p>
            <ol className="mt-2 space-y-1 list-inside list-decimal text-xs">
              <li>Copie o "Seu Código" e envie para seu parceiro</li>
              <li>Cole o código do seu parceiro e clique "Ativar"</li>
              <li>Seu parceiro faz o mesmo (cola o seu código e ativa)</li>
              <li>
                Quando os dois ativarem, ambos veem "Totais do Casal" na tela
                inicial com os dados combinados
              </li>
              <li>Qualquer um pode desativar a qualquer momento</li>
            </ol>
          </div>
        </>
      ) : null}
    </main>
  );
}
