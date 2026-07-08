import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Sem filtro por user_id: o RLS libera as minhas semanas + as semanas
    // conjuntas do casal (parceira vinculada com consentimento).
    const { data, error } = await supabase
      .from("weeks")
      .select("*")
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao carregar semanas" },
        { status: 400 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      notes,
      num_marmitas,
      is_shared,
      person2_name,
      num_marmitas_p2,
      extras,
    } = body;

    if (!title || !num_marmitas) {
      return NextResponse.json(
        { error: "Título e número de marmitas são obrigatórios" },
        { status: 400 }
      );
    }

    // Semana conjunta de quem está vinculado vira "semana do casal":
    // grava o household_id (resolvido no servidor) para a parceira ver.
    let householdId: string | null = null;
    if (is_shared) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("household_id, share_consent")
        .eq("id", user.id)
        .single();
      if (profile?.share_consent) {
        householdId = profile.household_id;
      }
    }

    const { data, error } = await supabase
      .from("weeks")
      .insert({
        user_id: user.id,
        title: title.trim(),
        notes: notes?.trim() || null,
        num_marmitas,
        is_shared: is_shared ?? false,
        person2_name: person2_name?.trim() || null,
        num_marmitas_p2: num_marmitas_p2 ?? 0,
        household_id: householdId,
        extras: Array.isArray(extras) ? extras : [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao criar semana" },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
