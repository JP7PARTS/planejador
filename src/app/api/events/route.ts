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

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
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
    const { title, event_date, base_people_count, recipe_ids } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Nome da refeição é obrigatório" },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipe_ids) || recipe_ids.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos uma receita" },
        { status: 400 }
      );
    }

    // Criar o evento
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        title: title.trim(),
        event_date: event_date || null,
        base_people_count: base_people_count || 1,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Adicionar as receitas ao evento
    const eventRecipesData = recipe_ids.map(
      (
        item: { recipe_id: string; people_count: number; order_index: number },
        idx: number
      ) => ({
        event_id: event.id,
        recipe_id: item.recipe_id,
        people_count: item.people_count || base_people_count || 1,
        order_index: item.order_index ?? idx,
      })
    );

    const { error: recipeError } = await supabase
      .from("event_recipes")
      .insert(eventRecipesData);

    if (recipeError) throw recipeError;

    return NextResponse.json(event);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
