import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { calculateWeekSummary, WeekItem } from "@/lib/calc";
import { Food, WeekItemDB } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Busca o perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("household_id, share_consent")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 }
      );
    }

    // Verifica se o usuário habilitou compartilhamento
    if (!profile.share_consent) {
      return NextResponse.json(
        { error: "Compartilhamento não ativado" },
        { status: 400 }
      );
    }

    // Busca todos os usuários com o mesmo household_id que tenham share_consent = true
    const { data: householdUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, display_name, share_consent")
      .eq("household_id", profile.household_id)
      .eq("share_consent", true);

    if (usersError) {
      return NextResponse.json(
        { error: usersError.message || "Erro ao carregar casal" },
        { status: 400 }
      );
    }

    if (!householdUsers || householdUsers.length === 0) {
      return NextResponse.json(
        { error: "Nenhum membro do casal com consentimento" },
        { status: 400 }
      );
    }

    // Busca todos os alimentos dos usuários da família
    const { data: foods, error: foodsError } = await supabase
      .from("foods")
      .select("*");

    if (foodsError) {
      return NextResponse.json(
        { error: foodsError.message || "Erro ao carregar alimentos" },
        { status: 400 }
      );
    }

    const foodsMap: Record<string, Food> = {};
    (foods || []).forEach((f) => {
      foodsMap[f.id] = f;
    });

    // Busca as semanas de todos os usuários da família
    const userIds = householdUsers.map((u) => u.id);
    const { data: allWeeks, error: weeksError } = await supabase
      .from("weeks")
      .select("id, user_id, num_marmitas")
      .in("user_id", userIds);

    if (weeksError) {
      return NextResponse.json(
        { error: weeksError.message || "Erro ao carregar semanas" },
        { status: 400 }
      );
    }

    // Busca todos os items de todas as semanas
    const weekIds = (allWeeks || []).map((w) => w.id);
    if (weekIds.length === 0) {
      return NextResponse.json({
        totalKcal: 0,
        totalProtein: 0,
        totalCarb: 0,
        totalFat: 0,
        totalRawPerFood: {},
        numMarmitas: 0,
        users: householdUsers.map((u) => ({
          id: u.id,
          name: u.display_name || "Sem nome",
        })),
      });
    }

    const { data: allItems, error: itemsError } = await supabase
      .from("week_items")
      .select("*")
      .in("week_id", weekIds);

    if (itemsError) {
      return NextResponse.json(
        { error: itemsError.message || "Erro ao carregar items" },
        { status: 400 }
      );
    }

    // Converte items para formato do calc.ts
    const weekItems: WeekItem[] = (allItems || []).map((item: WeekItemDB) => ({
      foodId: item.food_id,
      cookedGramsPerMarmita: item.cooked_grams_per_marmita,
      numMarmitas: item.num_marmitas,
    }));

    // Soma o total de marmitas
    const totalMarmitas = (allWeeks || []).reduce(
      (sum, w) => sum + w.num_marmitas,
      0
    );

    // Calcula o resumo
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
      users: householdUsers.map((u) => ({
        id: u.id,
        name: u.display_name || "Sem nome",
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
