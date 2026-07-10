import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Normaliza os campos numéricos opcionais (aceita number, string ou vazio).
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Limpa a lista de passos: strings não-vazias, na ordem.
function sanitizeSteps(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
}

// Ingredientes válidos: precisam de food_id e gramas > 0.
function sanitizeIngredients(
  v: unknown
): { food_id: string; cooked_grams_per_marmita: number }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((i) => {
      const item = i as { food_id?: unknown; cooked_grams_per_marmita?: unknown };
      const foodId = typeof item.food_id === "string" ? item.food_id : "";
      const grams = Number(item.cooked_grams_per_marmita);
      return { food_id: foodId, cooked_grams_per_marmita: grams };
    })
    .filter((i) => i.food_id && Number.isFinite(i.cooked_grams_per_marmita) && i.cooked_grams_per_marmita > 0);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("recipes")
      .select("*, ingredients:recipe_ingredients(*)")
      .order("title");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao carregar receitas" },
        { status: 400 }
      );
    }

    return NextResponse.json(data ?? []);
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
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const ingredients = sanitizeIngredients(body.ingredients);

    if (!title) {
      return NextResponse.json(
        { error: "Nome da receita é obrigatório" },
        { status: 400 }
      );
    }
    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um ingrediente" },
        { status: 400 }
      );
    }

    const { data: recipe, error } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        title,
        steps: sanitizeSteps(body.steps),
        total_time_min: numOrNull(body.total_time_min),
        pressure_time_min: numOrNull(body.pressure_time_min),
        yield_marmitas: numOrNull(body.yield_marmitas),
        prep_notes:
          typeof body.prep_notes === "string" && body.prep_notes.trim()
            ? body.prep_notes.trim()
            : null,
      })
      .select()
      .single();

    if (error || !recipe) {
      return NextResponse.json(
        { error: error?.message || "Erro ao criar receita" },
        { status: 400 }
      );
    }

    const { data: ings, error: ingErr } = await supabase
      .from("recipe_ingredients")
      .insert(
        ingredients.map((i) => ({
          recipe_id: recipe.id,
          food_id: i.food_id,
          cooked_grams_per_marmita: i.cooked_grams_per_marmita,
        }))
      )
      .select();

    if (ingErr) {
      // Desfaz a receita se os ingredientes falharem (evita receita órfã).
      await supabase.from("recipes").delete().eq("id", recipe.id);
      return NextResponse.json(
        { error: ingErr.message || "Erro ao salvar ingredientes" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ...recipe, ingredients: ings ?? [] }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
