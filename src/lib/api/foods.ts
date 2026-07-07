import { Food } from "@/lib/types";

export async function createFood(food: Omit<Food, "id" | "user_id" | "created_at">) {
  const res = await fetch("/api/foods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(food),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao criar alimento");
  }

  return res.json() as Promise<Food>;
}

export async function updateFood(
  id: string,
  food: Omit<Food, "id" | "user_id" | "created_at">
) {
  const res = await fetch(`/api/foods/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(food),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao editar alimento");
  }

  return res.json() as Promise<Food>;
}

export async function deleteFood(id: string) {
  const res = await fetch(`/api/foods/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao deletar alimento");
  }
}
