import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    const { name, shopping_name, category, kcal_per_100g, protein_g_per_100g, carb_g_per_100g, fat_g_per_100g, fc } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Nome e categoria são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("foods")
      .insert({
        user_id: user.id,
        name,
        shopping_name: shopping_name?.trim() || null,
        category,
        kcal_per_100g: kcal_per_100g ?? 0,
        protein_g_per_100g: protein_g_per_100g ?? 0,
        carb_g_per_100g: carb_g_per_100g ?? 0,
        fat_g_per_100g: fat_g_per_100g ?? 0,
        fc: fc ?? 1.0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao criar alimento" },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
