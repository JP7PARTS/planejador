import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Food } from "@/lib/types";

// Linha crua vinda da RPC get_household_data (já enriquecida na migração 0010).
interface HouseholdItemRow {
  food_id: string;
  food_name: string;
  category: Food["category"];
  fc: number;
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carb_g_per_100g: number;
  fat_g_per_100g: number;
  cooked_grams_per_marmita: number;
  num_marmitas: number;
  owner_id: string;
  week_id: string;
  week_num_marmitas: number;
  week_created_at: string;
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

    // Função no banco (security definer): agrega membros e items (com
    // categoria, dono e data da semana) de quem consentiu no mesmo household.
    // Retorna null se o usuário atual não ativou o compartilhamento.
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

    // Repassa os itens crus + membros; o filtro por período e os agregados
    // (junto e por pessoa) são feitos no cliente (consolidacao/page.tsx).
    return NextResponse.json({
      members: household.members.map((m) => ({
        id: m.id,
        name: m.name || "Sem nome",
      })),
      items: household.items || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
