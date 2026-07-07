import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Pega o valor atual de is_favorite
    const { data: week, error: getError } = await supabase
      .from("weeks")
      .select("is_favorite")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (getError || !week) {
      return NextResponse.json(
        { error: "Semana não encontrada" },
        { status: 404 }
      );
    }

    // Alterna o valor
    const { data, error } = await supabase
      .from("weeks")
      .update({
        is_favorite: !week.is_favorite,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao atualizar favorito" },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
