import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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
    const { food_id, cooked_grams_per_marmita, num_marmitas, person } = body;

    if (!food_id || !cooked_grams_per_marmita || !num_marmitas) {
      return NextResponse.json(
        { error: "Alimento, gramas e número de marmitas são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("week_items")
      .insert({
        week_id: id,
        food_id,
        cooked_grams_per_marmita,
        num_marmitas,
        person: person === 2 ? 2 : 1,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao adicionar alimento" },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
