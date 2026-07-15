import {
  Event,
  EventWithRecipes,
  EventRecipe,
  ShoppingItem,
  RecipeWithIngredients,
  Food,
} from "@/lib/types";
import { calculateWeekItem, nomeCompra } from "@/lib/calc";
import { agruparIngredientes } from "@/lib/api/recipes";

// Fatores de porção por faixa etária (pesquisados pelo usuário).
export const FATOR_CRIANCA_MAIOR = 0.6; // 7–12 anos
export const FATOR_CRIANCA_PEQUENA = 0.4; // até 6 anos

// Converte a composição de pessoas em "porções equivalentes" de adulto.
export function porcoesEfetivas(
  adults: number,
  kidsOlder: number,
  kidsYoung: number
): number {
  return (
    (adults || 0) +
    (kidsOlder || 0) * FATOR_CRIANCA_MAIOR +
    (kidsYoung || 0) * FATOR_CRIANCA_PEQUENA
  );
}

export interface EventInput {
  title: string;
  event_date: string | null;
  adults: number;
  kids_older: number;
  kids_young: number;
  recipe_ids: Array<{
    recipe_id: string;
    order_index: number;
    choices?: Record<string, string>;
  }>;
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

// Calcula a lista de compras consolidada de um evento. `porcoes` é o número de
// porções equivalentes de adulto (ver porcoesEfetivas), igual para todos os pratos.
// Para cada ingrediente, consolida por alimento em gramas cru.
export function calcularListaCompras(
  eventRecipes: EventRecipe[],
  alimentos: Food[],
  porcoes: number
): ShoppingItem[] {
  const alimentosMap: Record<string, Food> = {};
  alimentos.forEach((f) => (alimentosMap[f.id] = f));

  // Agrega por nome de compra: alimentos diferentes (ex.: "Acém cozido" e
  // "Acém grelhado") com o mesmo nome de compra juntam numa linha só.
  const porCompra: Record<
    string,
    { food_id: string; name: string; category: string; grams: number }
  > = {};

  function acumular(food: Food, cookedGrams: number) {
    const rawGrams = cookedGrams / food.fc;
    const nome = nomeCompra(food);
    if (!porCompra[nome]) {
      porCompra[nome] = {
        food_id: food.id,
        name: nome,
        category: food.category,
        grams: 0,
      };
    }
    porCompra[nome].grams += rawGrams;
  }

  eventRecipes.forEach((er) => {
    if (!er.recipe || !er.recipe.ingredients) return;

    const { fixos, escolhas } = agruparIngredientes(er.recipe.ingredients);

    // Adiciona ingredientes fixos
    fixos.forEach((ing) => {
      const food = alimentosMap[ing.food_id];
      if (!food) return;
      acumular(food, ing.cooked_grams_per_marmita * porcoes);
    });

    // Adiciona a opção escolhida de cada escolha (fallback: 1ª opção)
    escolhas.forEach((escolha) => {
      const foodId = er.choices?.[escolha.group] || escolha.food_ids[0];
      const food = alimentosMap[foodId];
      if (!food) return;
      acumular(food, escolha.cooked_grams_per_marmita * porcoes);
    });
  });

  return Object.values(porCompra).map((data) => ({
    food_id: data.food_id,
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
