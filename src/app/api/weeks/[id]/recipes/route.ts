import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Substitui TODAS as receitas vinculadas à semana de uma vez: apaga as atuais
// e insere a lista de recipe_ids recebida. Só o dono da semana pode fazer.
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

    const body = await req.json();
    const recipeIds: string[] = Array.isArray(body.recipe_ids)
      ? Array.from(
          new Set(
            body.recipe_ids.filter((r: unknown) => typeof r === "string" && r)
          )
        )
      : [];

    // Apaga os vínculos atuais
    const { error: delError } = await supabase
      .from("week_recipes")
      .delete()
      .eq("week_id", id);

    if (delError) {
      return NextResponse.json(
        { error: delError.message || "Erro ao limpar receitas" },
        { status: 400 }
      );
    }

    if (recipeIds.length > 0) {
      const { error: insError } = await supabase
        .from("week_recipes")
        .insert(recipeIds.map((recipe_id) => ({ week_id: id, recipe_id })));

      if (insError) {
        return NextResponse.json(
          { error: insError.message || "Erro ao vincular receitas" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true, count: recipeIds.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
