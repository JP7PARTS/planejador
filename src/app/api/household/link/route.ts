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
    const { partner_code } = body;

    if (!partner_code) {
      return NextResponse.json(
        { error: "O código do parceiro é obrigatório" },
        { status: 400 }
      );
    }

    // A função no banco (security definer) valida o parceiro, marca o
    // próprio share_consent e converge os dois para o mesmo household_id.
    const { error: rpcError } = await supabase.rpc("link_household", {
      p_partner_code: partner_code,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: rpcError.message || "Erro ao ativar compartilhamento" },
        { status: 400 }
      );
    }

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
