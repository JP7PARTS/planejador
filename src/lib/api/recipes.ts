import { RecipeWithIngredients } from "@/lib/types";

// Um ingrediente ao criar/editar uma receita: aponta para um alimento e diz
// quantos gramas prontos entram por marmita.
export interface RecipeIngredientInput {
  food_id: string;
  cooked_grams_per_marmita: number;
}

// Dados enviados para criar/editar uma receita.
export interface RecipeInput {
  title: string;
  steps: string[];
  total_time_min: number | null;
  pressure_time_min: number | null;
  yield_marmitas: number | null;
  prep_notes: string | null;
  ingredients: RecipeIngredientInput[];
}

export async function listRecipes() {
  const res = await fetch("/api/recipes");
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao carregar receitas");
  }
  return res.json() as Promise<RecipeWithIngredients[]>;
}

export async function getRecipe(id: string) {
  const res = await fetch(`/api/recipes/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao carregar receita");
  }
  return res.json() as Promise<RecipeWithIngredients>;
}

export async function createRecipe(input: RecipeInput) {
  const res = await fetch("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao criar receita");
  }
  return res.json() as Promise<RecipeWithIngredients>;
}

export async function updateRecipe(id: string, input: RecipeInput) {
  const res = await fetch(`/api/recipes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao editar receita");
  }
  return res.json() as Promise<RecipeWithIngredients>;
}

export async function deleteRecipe(id: string) {
  const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao deletar receita");
  }
}
