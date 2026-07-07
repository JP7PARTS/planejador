import { Week, WeekItemDB } from "@/lib/types";

export interface WeekData {
  title: string;
  notes?: string;
  num_marmitas: number;
}

export interface WeekItemData {
  food_id: string;
  cooked_grams_per_marmita: number;
  num_marmitas: number;
}

export async function listWeeks(): Promise<Week[]> {
  const res = await fetch("/api/weeks");
  if (!res.ok) {
    throw new Error(`Erro ao carregar semanas: ${res.statusText}`);
  }
  return res.json();
}

export async function getWeek(id: string): Promise<{ week: Week; items: WeekItemDB[] }> {
  const res = await fetch(`/api/weeks/${id}`);
  if (!res.ok) {
    throw new Error(`Erro ao carregar semana: ${res.statusText}`);
  }
  return res.json();
}

export async function createWeek(data: WeekData): Promise<Week> {
  const res = await fetch("/api/weeks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao criar semana");
  }
  return res.json();
}

export async function updateWeek(id: string, data: Partial<WeekData>): Promise<Week> {
  const res = await fetch(`/api/weeks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao atualizar semana");
  }
  return res.json();
}

export async function deleteWeek(id: string): Promise<void> {
  const res = await fetch(`/api/weeks/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao deletar semana");
  }
}

export async function toggleFavorite(id: string): Promise<Week> {
  const res = await fetch(`/api/weeks/${id}/favorite`, {
    method: "PUT",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao marcar favorito");
  }
  return res.json();
}

export async function duplicateWeek(id: string, newTitle: string): Promise<Week> {
  const res = await fetch(`/api/weeks/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao duplicar semana");
  }
  return res.json();
}

export async function addWeekItem(
  weekId: string,
  data: WeekItemData
): Promise<WeekItemDB> {
  const res = await fetch(`/api/weeks/${weekId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao adicionar alimento");
  }
  return res.json();
}

export async function deleteWeekItem(weekId: string, itemId: string): Promise<void> {
  const res = await fetch(`/api/weeks/${weekId}/items/${itemId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao remover alimento");
  }
}
