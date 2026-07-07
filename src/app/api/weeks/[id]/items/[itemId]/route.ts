import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verifica que a semana pertence ao usuário
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (weekError || !week) {
      return NextResponse.json(
        { error: "Semana não encontrada" },
        { status: 404 }
      );
    }

    // Deleta o item
    const { error } = await supabase
      .from("week_items")
      .delete()
      .eq("id", itemId)
      .eq("week_id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao remover alimento" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
