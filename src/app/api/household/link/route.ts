import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { target_household_id } = body;

    if (!target_household_id) {
      return NextResponse.json(
        { error: "ID da família é obrigatório" },
        { status: 400 }
      );
    }

    // Busca o perfil do usuário atual
    const { data: currentProfile, error: currentError } = await supabase
      .from("profiles")
      .select("household_id, share_consent")
      .eq("id", user.id)
      .single();

    if (currentError || !currentProfile) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 }
      );
    }

    // Busca o perfil do alvo
    const { data: targetProfile, error: targetError } = await supabase
      .from("profiles")
      .select("id, household_id, share_consent")
      .eq("household_id", target_household_id)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json(
        { error: targetError.message || "Erro ao buscar família" },
        { status: 400 }
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        { error: "Família não encontrada" },
        { status: 404 }
      );
    }

    // Verifica se o alvo consentiu compartilhar
    if (!targetProfile.share_consent) {
      return NextResponse.json(
        { error: "Seu parceiro ainda não habilitou o compartilhamento" },
        { status: 400 }
      );
    }

    // Atualiza o household_id do usuário atual para o do alvo
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        household_id: targetProfile.household_id,
        share_consent: true,
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Erro ao atualizar perfil" },
        { status: 400 }
      );
    }

    // Registra o link de compartilhamento na auditoria
    await supabase.from("household_links").insert({
      user_id_initiator: user.id,
      user_id_target: targetProfile.id,
      linked_household_id: targetProfile.household_id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Gera um novo household_id único para este usuário
    const newHouseholdId = crypto.randomUUID();

    // Atualiza o perfil: novo household_id e share_consent = false
    const { error } = await supabase
      .from("profiles")
      .update({
        household_id: newHouseholdId,
        share_consent: false,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao desativar compartilhamento" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
