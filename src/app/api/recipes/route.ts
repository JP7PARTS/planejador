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

// Ingredientes fixos válidos: precisam de food_id e gramas > 0.
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

// Escolhas válidas: rótulo, gramas > 0 e pelo menos uma opção de alimento.
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

// Monta as linhas de recipe_ingredients: fixos (choice_group null) + as opções
// de cada escolha (mesmo choice_group/rótulo/gramas por grupo). Garante no
// máximo um slot principal (fixo tem precedência sobre escolha).
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
      .select("*, ingredients:recipe_ingredients(*), seasonings:recipe_seasonings(*)")
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
      .insert(buildIngredientRows(recipe.id, ingredients, choices))
      .select();

    if (ingErr) {
      // Desfaz a receita se os ingredientes falharem (evita receita órfã).
      await supabase.from("recipes").delete().eq("id", recipe.id);
      return NextResponse.json(
        { error: ingErr.message || "Erro ao salvar ingredientes" },
        { status: 400 }
      );
    }

    // Temperos & aromáticos (opcionais; não bloqueiam a criação).
    const seasonings = sanitizeSeasonings(body.seasonings);
    let seas: unknown[] = [];
    if (seasonings.length > 0) {
      const { data: s } = await supabase
        .from("recipe_seasonings")
        .insert(buildSeasoningRows(recipe.id, seasonings))
        .select();
      seas = s ?? [];
    }

    return NextResponse.json(
      { ...recipe, ingredients: ings ?? [], seasonings: seas },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
