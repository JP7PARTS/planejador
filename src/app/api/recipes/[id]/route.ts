import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sanitizeSteps(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
}

type IngInput = {
  food_id: string;
  cooked_grams_per_marmita: number;
  is_principal: boolean;
};
type ChoiceInput = {
  label: string;
  cooked_grams_per_marmita: number;
  food_ids: string[];
  is_principal: boolean;
};

function sanitizeIngredients(v: unknown): IngInput[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((i) => {
      const item = i as {
        food_id?: unknown;
        cooked_grams_per_marmita?: unknown;
        is_principal?: unknown;
      };
      const foodId = typeof item.food_id === "string" ? item.food_id : "";
      const grams = Number(item.cooked_grams_per_marmita);
      return {
        food_id: foodId,
        cooked_grams_per_marmita: grams,
        is_principal: !!item.is_principal,
      };
    })
    .filter((i) => i.food_id && Number.isFinite(i.cooked_grams_per_marmita) && i.cooked_grams_per_marmita > 0);
}

function sanitizeChoices(v: unknown): ChoiceInput[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => {
      const item = c as {
        label?: unknown;
        cooked_grams_per_marmita?: unknown;
        food_ids?: unknown;
        is_principal?: unknown;
      };
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const grams = Number(item.cooked_grams_per_marmita);
      const food_ids = Array.isArray(item.food_ids)
        ? Array.from(
            new Set(
              item.food_ids.filter(
                (f: unknown): f is string => typeof f === "string" && !!f
              )
            )
          )
        : [];
      return {
        label,
        cooked_grams_per_marmita: grams,
        food_ids,
        is_principal: !!item.is_principal,
      };
    })
    .filter(
      (c) =>
        c.label &&
        Number.isFinite(c.cooked_grams_per_marmita) &&
        c.cooked_grams_per_marmita > 0 &&
        c.food_ids.length > 0
    );
}

// Garante no máximo um slot principal (fixo tem precedência sobre escolha).
function buildIngredientRows(
  recipeId: string,
  ingredients: IngInput[],
  choices: ChoiceInput[]
) {
  const fixoPrincipalIdx = ingredients.findIndex((i) => i.is_principal);
  const choicePrincipalIdx =
    fixoPrincipalIdx === -1 ? choices.findIndex((c) => c.is_principal) : -1;

  const fixos = ingredients.map((i, idx) => ({
    recipe_id: recipeId,
    food_id: i.food_id,
    cooked_grams_per_marmita: i.cooked_grams_per_marmita,
    choice_group: null as number | null,
    choice_label: null as string | null,
    is_principal: idx === fixoPrincipalIdx,
  }));
  const escolhas = choices.flatMap((c, idx) =>
    c.food_ids.map((food_id) => ({
      recipe_id: recipeId,
      food_id,
      cooked_grams_per_marmita: c.cooked_grams_per_marmita,
      choice_group: idx + 1,
      choice_label: c.label,
      is_principal: idx === choicePrincipalIdx,
    }))
  );
  return [...fixos, ...escolhas];
}

// Temperos válidos: precisam de nome. quantity nula = "a gosto".
function sanitizeSeasonings(
  v: unknown
): { name: string; quantity: number | null }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => {
      const item = s as { name?: unknown; quantity?: unknown };
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const q = Number(item.quantity);
      const quantity =
        item.quantity === "" || item.quantity == null || !Number.isFinite(q) || q <= 0
          ? null
          : q;
      return { name, quantity };
    })
    .filter((s) => s.name.length > 0);
}

function buildSeasoningRows(
  recipeId: string,
  seasonings: { name: string; quantity: number | null }[]
) {
  return seasonings.map((s, idx) => ({
    recipe_id: recipeId,
    name: s.name,
    quantity: s.quantity,
    order_index: idx,
  }));
}

export async function GET(
  _req: NextRequest,
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

    const { data, error } = await supabase
      .from("recipes")
      .select("*, ingredients:recipe_ingredients(*), seasonings:recipe_seasonings(*)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Receita não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
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

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const ingredients = sanitizeIngredients(body.ingredients);
    const choices = sanitizeChoices(body.choices);

    if (!title) {
      return NextResponse.json(
        { error: "Nome da receita é obrigatório" },
        { status: 400 }
      );
    }
    if (ingredients.length === 0 && choices.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um ingrediente" },
        { status: 400 }
      );
    }

    const { data: recipe, error } = await supabase
      .from("recipes")
      .update({
        title,
        steps: sanitizeSteps(body.steps),
        total_time_min: numOrNull(body.total_time_min),
        pressure_time_min: numOrNull(body.pressure_time_min),
        yield_marmitas: numOrNull(body.yield_marmitas),
        prep_notes:
          typeof body.prep_notes === "string" && body.prep_notes.trim()
            ? body.prep_notes.trim()
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !recipe) {
      return NextResponse.json(
        { error: error?.message || "Receita não encontrada" },
        { status: 404 }
      );
    }

    // Substitui os ingredientes (apaga os antigos e insere os novos).
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);

    const { data: ings, error: ingErr } = await supabase
      .from("recipe_ingredients")
      .insert(buildIngredientRows(id, ingredients, choices))
      .select();

    if (ingErr) {
      return NextResponse.json(
        { error: ingErr.message || "Erro ao salvar ingredientes" },
        { status: 400 }
      );
    }

    // Substitui os temperos (apaga os antigos e insere os novos).
    await supabase.from("recipe_seasonings").delete().eq("recipe_id", id);
    const seasonings = sanitizeSeasonings(body.seasonings);
    let seas: unknown[] = [];
    if (seasonings.length > 0) {
      const { data: s } = await supabase
        .from("recipe_seasonings")
        .insert(buildSeasoningRows(id, seasonings))
        .select();
      seas = s ?? [];
    }

    return NextResponse.json({ ...recipe, ingredients: ings ?? [], seasonings: seas });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
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

    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao deletar receita" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
