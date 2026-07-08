"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { linkHousehold, unlinkHousehold } from "@/lib/api/household";
import SignOutButton from "../sign-out-button";

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

  const cardClass =
    "rounded-[20px] border border-[#EADFCD] bg-white p-5 dark:border-slate-800 dark:bg-slate-900";
  const inputClass =
    "w-full rounded-xl border border-[#E2D7C4] bg-[#FCFAF5] px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const inicial = (profile?.display_name || "?").trim().charAt(0).toUpperCase();

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-5 py-8 sm:py-10">
      <div>
        <h1 className="text-[clamp(26px,4vw,34px)] font-bold tracking-tight">
          Ajustes
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">
          Seu perfil e o vínculo do casal
        </p>
      </div>

      {erro && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          {sucesso}
        </div>
      )}

      {carregando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Carregando…
        </p>
      ) : profile ? (
        <div className="flex flex-col gap-3.5">
          {/* Perfil */}
          <div className={cardClass}>
            <h2 className="mb-3.5 text-[17px] font-bold">Perfil</h2>
            <div className="flex items-center gap-3.5">
              <span className="grid size-[54px] place-items-center rounded-2xl bg-emerald-600/10 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {inicial}
              </span>
              <div>
                <p className="text-base font-bold">
                  {profile.display_name || "Sem nome"}
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Perfil pessoal
                </p>
              </div>
            </div>
          </div>

          {/* Compartilhar com o casal */}
          <div className={cardClass}>
            <h2 className="mb-1.5 text-[17px] font-bold">
              👥 Compartilhar com o casal
            </h2>
            <p className="mb-3.5 text-sm text-slate-600 dark:text-slate-300">
              Ao ativar, você e seu parceiro veem os totais combinados. Nada é
              compartilhado sem o seu consentimento.
            </p>

            {/* Seu código de família (sempre disponível para copiar) */}
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
              Seu ID de família
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profile.id}
                readOnly
                className="flex-1 rounded-xl border border-[#E2D7C4] bg-[#FCFAF5] px-3 py-2.5 font-mono text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profile.id);
                  setSucesso("Código copiado!");
                  setTimeout(() => setSucesso(null), 3000);
                }}
                className="shrink-0 rounded-xl bg-[#EFE7D8] px-4 text-sm font-semibold text-slate-600 transition hover:brightness-95 dark:bg-slate-800 dark:text-slate-300"
              >
                Copiar
              </button>
            </div>

            {/* Ativar / Desativar */}
            {profile.share_consent ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  ✅ Compartilhamento ativo
                </p>
                <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                  Você está compartilhando os dados com seu casal.
                </p>
                <button
                  onClick={handleDesativarCompartilhamento}
                  disabled={desativando}
                  className="mt-3 rounded-xl border border-[#F0DAD2] bg-[#FCF4F1] px-4 py-2 text-sm font-semibold text-rose-600 transition hover:brightness-95 disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/20"
                >
                  {desativando ? "Desativando…" : "Desativar"}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                  Código do seu parceiro
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={targetHouseholdId}
                    onChange={(e) => setTargetHouseholdId(e.target.value)}
                    placeholder="Cole o ID de família do seu parceiro"
                    className={`${inputClass} min-w-[200px] flex-1 font-mono`}
                  />
                  <button
                    onClick={handleAtivareCompartilhamento}
                    disabled={ativando}
                    className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {ativando ? "Ativando…" : "Ativar"}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Peça para seu parceiro abrir Ajustes e copiar o "ID de família".
                </p>
              </div>
            )}
          </div>

          {/* Seus básicos */}
          <div className={cardClass}>
            <h2 className="mb-1.5 text-[17px] font-bold">🧂 Seus básicos</h2>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              Temperos que aparecem na lista de compras de toda semana (não entram
              no cálculo).
            </p>

            {profile.staples.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-[7px]">
                {profile.staples.map((s, i) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DECD] bg-[#F7F2E9] px-3 py-1.5 text-[13.5px] font-medium dark:border-slate-700 dark:bg-slate-800"
                  >
                    {s}
                    <button
                      onClick={() => removerBasico(i)}
                      disabled={salvandoBasicos}
                      aria-label={"Remover " + s}
                      className="text-rose-600 hover:opacity-70 disabled:opacity-60"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
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
                placeholder="Adicionar tempero…"
                className={inputClass}
              />
              <button
                onClick={adicionarBasico}
                disabled={salvandoBasicos}
                className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                Adicionar
              </button>
            </div>
          </div>

          <SignOutButton
            className="self-start rounded-xl border border-[#F0DAD2] bg-[#FCF4F1] px-4 py-2.5 text-[14.5px] font-semibold text-rose-600 transition hover:brightness-95 disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/20"
            label="Sair da conta"
          />
        </div>
      ) : null}
    </main>
  );
}
