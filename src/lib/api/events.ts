import {
  Event,
  EventWithRecipes,
  EventRecipe,
  ShoppingItem,
  RecipeWithIngredients,
  Food,
} from "@/lib/types";
import { calculateWeekItem } from "@/lib/calc";
import { agruparIngredientes } from "@/lib/api/recipes";

export interface EventInput {
  title: string;
  event_date: string | null;
  base_people_count: number;
  recipe_ids: Array<{ recipe_id: string; people_count: number; order_index: number }>;
}

export async function listEvents(): Promise<Event[]> {
  const res = await fetch("/api/events");
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao listar refeições");
  }
  return res.json();
}

export async function getEvent(id: string): Promise<EventWithRecipes> {
  const res = await fetch(`/api/events/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao buscar refeição");
  }
  return res.json();
}

export async function createEvent(data: EventInput): Promise<Event> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao criar refeição");
  }

  return res.json();
}

export async function updateEvent(id: string, data: EventInput): Promise<Event> {
  const res = await fetch(`/api/events/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao atualizar refeição");
  }

  return res.json();
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`/api/events/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao deletar refeição");
  }
}

// Calcula a lista de compras consolidada de um evento
// (para cada ingrediente de cada receita, consolida por alimento em gramas cru)
export function calcularListaCompras(
  eventRecipes: EventRecipe[],
  alimentos: Food[]
): ShoppingItem[] {
  const alimentosMap: Record<string, Food> = {};
  alimentos.forEach((f) => (alimentosMap[f.id] = f));

  const porAlimento: Record<
    string,
    { name: string; category: string; grams: number }
  > = {};

  eventRecipes.forEach((er) => {
    if (!er.recipe || !er.recipe.ingredients) return;

    const { fixos, escolhas } = agruparIngredientes(er.recipe.ingredients);

    // Adiciona ingredientes fixos
    fixos.forEach((ing) => {
      const food = alimentosMap[ing.food_id];
      if (!food) return;

      const cookedGrams = ing.cooked_grams_per_marmita * er.people_count;
      const rawGrams = cookedGrams / food.fc;

      if (!porAlimento[ing.food_id]) {
        porAlimento[ing.food_id] = {
          name: food.name,
          category: food.category,
          grams: 0,
        };
      }
      porAlimento[ing.food_id].grams += rawGrams;
    });

    // Adiciona primeira opção de cada escolha
    escolhas.forEach((escolha) => {
      const foodId = escolha.food_ids[0];
      const food = alimentosMap[foodId];
      if (!food) return;

      const cookedGrams = escolha.cooked_grams_per_marmita * er.people_count;
      const rawGrams = cookedGrams / food.fc;

      if (!porAlimento[foodId]) {
        porAlimento[foodId] = {
          name: food.name,
          category: food.category,
          grams: 0,
        };
      }
      porAlimento[foodId].grams += rawGrams;
    });
  });

  return Object.entries(porAlimento).map(([foodId, data]) => ({
    food_id: foodId,
    food_name: data.name,
    category: data.category,
    quantity_grams: Math.round(data.grams),
    quantity_kg: data.grams / 1000,
  }));
}

// Agrupa receitas por título (para exibir "Carne de panela: [passos]")
export function agruparReceitasPorTitulo(
  eventRecipes: EventRecipe[]
): Array<{
  title: string;
  steps: string[];
  total_time_min: number | null;
  pressure_time_min: number | null;
  prep_notes: string | null;
}> {
  const byTitle: Record<
    string,
    {
      title: string;
      steps: string[];
      total_time_min: number | null;
      pressure_time_min: number | null;
      prep_notes: string | null;
    }
  > = {};

  eventRecipes.forEach((er) => {
    if (!er.recipe) return;
    if (!byTitle[er.recipe.title]) {
      byTitle[er.recipe.title] = {
        title: er.recipe.title,
        steps: er.recipe.steps,
        total_time_min: er.recipe.total_time_min,
        pressure_time_min: er.recipe.pressure_time_min,
        prep_notes: er.recipe.prep_notes,
      };
    }
  });

  return Object.values(byTitle);
}

// Calcula o tempo máximo entre as receitas
export function tempoMaximo(eventRecipes: EventRecipe[]): number | null {
  let max: number | null = null;

  eventRecipes.forEach((er) => {
    if (!er.recipe) return;
    if (er.recipe.total_time_min != null) {
      max = max ? Math.max(max, er.recipe.total_time_min) : er.recipe.total_time_min;
    }
  });

  return max;
}
