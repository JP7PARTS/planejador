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
    const { title, event_date, adults, kids_older, kids_young, recipe_ids } =
      body;

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

    const nAdults = Math.max(0, Math.floor(Number(adults) || 0));
    const nKidsOlder = Math.max(0, Math.floor(Number(kids_older) || 0));
    const nKidsYoung = Math.max(0, Math.floor(Number(kids_young) || 0));
    const total = nAdults + nKidsOlder + nKidsYoung;

    if (total < 1) {
      return NextResponse.json(
        { error: "Informe pelo menos uma pessoa" },
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
        adults: nAdults,
        kids_older: nKidsOlder,
        kids_young: nKidsYoung,
        base_people_count: total,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Adicionar as receitas ao evento
    const eventRecipesData = recipe_ids.map(
      (
        item: {
          recipe_id: string;
          order_index: number;
          choices?: Record<string, string>;
        },
        idx: number
      ) => ({
        event_id: event.id,
        recipe_id: item.recipe_id,
        order_index: item.order_index ?? idx,
        choices: item.choices || {},
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
