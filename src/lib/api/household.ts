import { Food } from "@/lib/types";

// Item cru do casal (uma linha de week_items já com dados do alimento, dono e
// data da semana). O front filtra por período e agrega junto/separado.
export interface HouseholdItem {
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

export interface HouseholdSummary {
  members: Array<{ id: string; name: string }>;
  items: HouseholdItem[];
}

export async function getHouseholdSummary(): Promise<HouseholdSummary> {
  const res = await fetch("/api/household/summary");
  if (!res.ok) {
    throw new Error(`Erro ao carregar totais do casal: ${res.statusText}`);
  }
  return res.json();
}

export async function linkHousehold(partnerCode: string): Promise<void> {
  const res = await fetch("/api/household/link", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partner_code: partnerCode }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao ativar compartilhamento");
  }
}

export async function unlinkHousehold(): Promise<void> {
  const res = await fetch("/api/household/link", {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao desativar compartilhamento");
  }
}
