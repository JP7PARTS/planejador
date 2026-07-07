import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateWeekSummary, WeekItem } from "@/lib/calc";
import { Food } from "@/lib/types";

interface HouseholdItemRow {
  food_id: string;
  food_name: string;
  fc: number;
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carb_g_per_100g: number;
  fat_g_per_100g: number;
  cooked_grams_per_marmita: number;
  num_marmitas: number;
}

interface HouseholdData {
  members: Array<{ id: string; name: string }>;
  items: HouseholdItemRow[];
  total_marmitas: number;
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

    // Função no banco (security definer): agrega membros, items e total de
    // marmitas de quem consentiu no mesmo household. Retorna null se o
    // usuário atual não ativou o compartilhamento.
    const { data, error } = await supabase.rpc("get_household_data");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao carregar totais do casal" },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Compartilhamento não ativado" },
        { status: 400 }
      );
    }

    const household = data as HouseholdData;

    // Monta o mapa de alimentos a partir das linhas retornadas.
    const foodsMap: Record<string, Food> = {};
    household.items.forEach((row) => {
      foodsMap[row.food_id] = {
        id: row.food_id,
        name: row.food_name,
        fc: row.fc,
        kcal_per_100g: row.kcal_per_100g,
        protein_g_per_100g: row.protein_g_per_100g,
        carb_g_per_100g: row.carb_g_per_100g,
        fat_g_per_100g: row.fat_g_per_100g,
      } as Food;
    });

    const weekItems: WeekItem[] = household.items.map((row) => ({
      foodId: row.food_id,
      cookedGramsPerMarmita: row.cooked_grams_per_marmita,
      numMarmitas: row.num_marmitas,
    }));

    const totalMarmitas = household.total_marmitas;

    const summary = calculateWeekSummary(
      weekItems,
      foodsMap,
      totalMarmitas || 1
    );

    return NextResponse.json({
      totalKcal: summary.totalKcal,
      totalProtein: summary.totalProtein,
      totalCarb: summary.totalCarb,
      totalFat: summary.totalFat,
      totalRawPerFood: summary.totalRawPerFood,
      numMarmitas: totalMarmitas,
      users: household.members.map((m) => ({
        id: m.id,
        name: m.name || "Sem nome",
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
