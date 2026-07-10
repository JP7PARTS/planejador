import { createClient } from "@/lib/supabase/server";
import { ImportFood, BulkImportResult, BulkImportError } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const VALID_CATEGORIES = ["carbo", "proteina", "vegetal", "fruta", "outro"];

function normalizeNumber(v: unknown, defaultValue: number): number {
  if (v === null || v === undefined || v === "") return defaultValue;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : defaultValue;
}

function validateFood(food: unknown, row: number): { valid: boolean; food?: ImportFood; error?: BulkImportError } {
  const item = food as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const category = typeof item.category === "string" ? item.category.trim() : "";

  if (!name) {
    return {
      valid: false,
      error: {
        row,
        field: "name",
        value: String(item.name || ""),
        error: "Nome é obrigatório",
      },
    };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return {
      valid: false,
      error: {
        row,
        field: "category",
        value: category,
        error: `Categoria inválida. Use: ${VALID_CATEGORIES.join(", ")}`,
      },
    };
  }

  const validatedFood: ImportFood = {
    name,
    category: category as "carbo" | "proteina" | "vegetal" | "fruta" | "outro",
    kcal_per_100g: normalizeNumber(item.kcal_per_100g, 0),
    protein_g_per_100g: normalizeNumber(item.protein_g_per_100g, 0),
    carb_g_per_100g: normalizeNumber(item.carb_g_per_100g, 0),
    fat_g_per_100g: normalizeNumber(item.fat_g_per_100g, 0),
    fc: normalizeNumber(item.fc, 1.0),
  };

  return { valid: true, food: validatedFood };
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
    const foods = Array.isArray(body.foods) ? body.foods : [];
    const mode = body.mode === "update" ? "update" : "skip";

    // Validação: todas as linhas
    const validationErrors: BulkImportError[] = [];
    const validatedFoods: ImportFood[] = [];

    foods.forEach((food: unknown, idx: number) => {
      const result = validateFood(food, idx + 1);
      if (!result.valid && result.error) {
        validationErrors.push(result.error);
      } else if (result.valid && result.food) {
        validatedFoods.push(result.food);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validação falhou", errors: validationErrors },
        { status: 400 }
      );
    }

    if (validatedFoods.length === 0) {
      return NextResponse.json(
        { error: "Nenhum alimento válido para importar" },
        { status: 400 }
      );
    }

    // Buscar alimentos existentes do usuário para detectar duplicatas
    const { data: existingFoods, error: fetchErr } = await supabase
      .from("foods")
      .select("id, name")
      .eq("user_id", user.id);

    if (fetchErr) {
      return NextResponse.json(
        { error: "Erro ao buscar alimentos existentes" },
        { status: 500 }
      );
    }

    const existingNames = new Set(
      (existingFoods || []).map((f) => f.name.toLowerCase().trim())
    );

    // Agrupar por modo
    const toInsert: ImportFood[] = [];
    const toUpdate: { name: string; food: ImportFood }[] = [];

    validatedFoods.forEach((food) => {
      const lowerName = food.name.toLowerCase().trim();
      if (existingNames.has(lowerName)) {
        if (mode === "update") {
          toUpdate.push({ name: food.name, food });
        }
        // else: skip
      } else {
        toInsert.push(food);
      }
    });

    let imported = 0;
    let updated = 0;
    let skipped = validatedFoods.length - toInsert.length - toUpdate.length;

    // Usar transaction para garantir "all or nothing"
    try {
      // Insert novos alimentos
      if (toInsert.length > 0) {
        const insertRows = toInsert.map((f) => ({
          user_id: user.id,
          name: f.name,
          category: f.category,
          kcal_per_100g: f.kcal_per_100g || 0,
          protein_g_per_100g: f.protein_g_per_100g || 0,
          carb_g_per_100g: f.carb_g_per_100g || 0,
          fat_g_per_100g: f.fat_g_per_100g || 0,
          fc: f.fc || 1.0,
        }));

        const { error: insertErr } = await supabase
          .from("foods")
          .insert(insertRows);

        if (insertErr) {
          throw new Error(`Erro ao inserir alimentos: ${insertErr.message}`);
        }

        imported = toInsert.length;
      }

      // Update alimentos existentes (se modo == "update")
      if (mode === "update" && toUpdate.length > 0) {
        for (const { name, food } of toUpdate) {
          const { error: updateErr } = await supabase
            .from("foods")
            .update({
              category: food.category,
              kcal_per_100g: food.kcal_per_100g || 0,
              protein_g_per_100g: food.protein_g_per_100g || 0,
              carb_g_per_100g: food.carb_g_per_100g || 0,
              fat_g_per_100g: food.fat_g_per_100g || 0,
              fc: food.fc || 1.0,
            })
            .eq("user_id", user.id)
            .eq("name", name);

          if (updateErr) {
            throw new Error(`Erro ao atualizar ${name}: ${updateErr.message}`);
          }

          updated++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro durante a importação";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const result: BulkImportResult = {
      imported,
      skipped,
      updated,
    };

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
