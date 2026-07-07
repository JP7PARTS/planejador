export interface HouseholdSummary {
  totalKcal: number;
  totalProtein: number;
  totalCarb: number;
  totalFat: number;
  totalRawPerFood: Record<string, number>;
  numMarmitas: number;
  users: Array<{
    id: string;
    name: string;
  }>;
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
