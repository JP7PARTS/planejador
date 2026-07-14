import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Refeição não encontrada" },
        { status: 404 }
      );
    }

    // Carregar receitas do evento (com ingredients populadas)
    const { data: eventRecipes, error: recipeError } = await supabase
      .from("event_recipes")
      .select(`
        *,
        recipes:recipe_id(
          *,
          ingredients:recipe_ingredients(*)
        )
      `)
      .eq("event_id", id)
      .order("order_index", { ascending: true });

    if (recipeError) throw recipeError;

    return NextResponse.json({
      ...event,
      event_recipes: eventRecipes || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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

    // Verificar que o evento pertence ao usuário
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Refeição não encontrada" },
        { status: 404 }
      );
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

    // Atualizar evento
    const { error: updateError } = await supabase
      .from("events")
      .update({
        title: title.trim(),
        event_date: event_date || null,
        base_people_count: base_people_count || 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // Remover receitas antigas
    await supabase.from("event_recipes").delete().eq("event_id", id);

    // Adicionar novas receitas
    const eventRecipesData = recipe_ids.map(
      (
        item: { recipe_id: string; people_count: number; order_index: number },
        idx: number
      ) => ({
        event_id: id,
        recipe_id: item.recipe_id,
        people_count: item.people_count || base_people_count || 1,
        order_index: item.order_index ?? idx,
      })
    );

    const { error: recipeError } = await supabase
      .from("event_recipes")
      .insert(eventRecipesData);

    if (recipeError) throw recipeError;

    return NextResponse.json({ id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
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

    // Verificar que o evento pertence ao usuário
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Refeição não encontrada" },
        { status: 404 }
      );
    }

    // Deletar o evento (cascade vai deletar event_recipes também)
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
