import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Normaliza nome para casar alimentos (minúsculo, sem acento, sem espaços nas pontas).
function normalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

interface SharedFood {
  name: string;
  category: string;
  fc: number;
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carb_g_per_100g: number;
  fat_g_per_100g: number;
}
interface SharedIngredient {
  cooked_grams_per_marmita: number;
  choice_group: number | null;
  choice_label: string | null;
  is_principal: boolean;
  food: SharedFood;
}
interface SharedRecipe {
  title: string;
  steps: string[];
  total_time_min: number | null;
  pressure_time_min: number | null;
  yield_marmitas: number | null;
  prep_notes: string | null;
  ingredients: SharedIngredient[];
}

// Importa uma receita compartilhada para a conta do usuário: cria os alimentos
// que faltam (casando por nome) e recria a receita apontando para os ids dele.
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
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("get_shared_recipe", {
      p_recipe_id: code,
    });
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Receita não encontrada" },
        { status: 404 }
      );
    }
    const shared = data as SharedRecipe;

    if (!shared.ingredients || shared.ingredients.length === 0) {
      return NextResponse.json(
        { error: "Receita sem ingredientes" },
        { status: 400 }
      );
    }

    // Alimentos do importador → mapa por nome normalizado.
    const { data: meusFoods } = await supabase
      .from("foods")
      .select("id, name")
      .eq("user_id", user.id);
    const foodPorNome = new Map<string, string>();
    (meusFoods || []).forEach((f) =>
      foodPorNome.set(normalizar(f.name as string), f.id as string)
    );

    // Resolve o food_id de cada alimento da receita (cria o que faltar).
    async function resolverFoodId(sf: SharedFood): Promise<string> {
      const chave = normalizar(sf.name);
      const existente = foodPorNome.get(chave);
      if (existente) return existente;
      const { data: novo, error: insErr } = await supabase
        .from("foods")
        .insert({
          user_id: user!.id,
          name: sf.name,
          category: sf.category,
          fc: sf.fc,
          kcal_per_100g: sf.kcal_per_100g,
          protein_g_per_100g: sf.protein_g_per_100g,
          carb_g_per_100g: sf.carb_g_per_100g,
          fat_g_per_100g: sf.fat_g_per_100g,
        })
        .select("id")
        .single();
      if (insErr || !novo) {
        throw new Error(insErr?.message || "Erro ao criar alimento");
      }
      foodPorNome.set(chave, novo.id as string);
      return novo.id as string;
    }

    // Título único (unique(user_id, title)).
    const { data: minhasReceitas } = await supabase
      .from("recipes")
      .select("title")
      .eq("user_id", user.id);
    const titulosExistentes = new Set(
      (minhasReceitas || []).map((r) => (r.title as string).toLowerCase())
    );
    let titulo = shared.title || "Receita importada";
    if (titulosExistentes.has(titulo.toLowerCase())) {
      let candidato = `${titulo} (importada)`;
      let n = 2;
      while (titulosExistentes.has(candidato.toLowerCase())) {
        candidato = `${titulo} (importada ${n})`;
        n++;
      }
      titulo = candidato;
    }

    // Cria a receita.
    const { data: recipe, error: recErr } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        title: titulo,
        steps: Array.isArray(shared.steps) ? shared.steps : [],
        total_time_min: shared.total_time_min ?? null,
        pressure_time_min: shared.pressure_time_min ?? null,
        yield_marmitas: shared.yield_marmitas ?? null,
        prep_notes: shared.prep_notes ?? null,
      })
      .select("id")
      .single();
    if (recErr || !recipe) {
      return NextResponse.json(
        { error: recErr?.message || "Erro ao criar receita" },
        { status: 400 }
      );
    }

    // Monta as linhas de ingrediente com os ids resolvidos.
    const rows = [];
    for (const ing of shared.ingredients) {
      if (!ing.food) continue;
      const food_id = await resolverFoodId(ing.food);
      rows.push({
        recipe_id: recipe.id,
        food_id,
        cooked_grams_per_marmita: ing.cooked_grams_per_marmita,
        choice_group: ing.choice_group ?? null,
        choice_label: ing.choice_label ?? null,
        is_principal: !!ing.is_principal,
      });
    }

    const { error: ingErr } = await supabase
      .from("recipe_ingredients")
      .insert(rows);
    if (ingErr) {
      await supabase.from("recipes").delete().eq("id", recipe.id);
      return NextResponse.json(
        { error: ingErr.message || "Erro ao salvar ingredientes" },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: recipe.id, title: titulo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
