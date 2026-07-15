import { RecipeWithIngredients, RecipeIngredient } from "@/lib/types";

// Um tempero/aromático ao criar/editar uma receita (nome + quantidade opcional).
export interface RecipeSeasoningInput {
  name: string;
  quantity: number | null;
}

// Normaliza nome para agrupar (minúsculo, sem acento, sem espaços nas pontas).
function normalizarNome(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Junta os temperos das receitas (fixos por receita: cada receita contribui uma
// vez) por nome, somando quantidades. Sem quantidade = "a gosto".
// Devolve rótulos prontos: "2× cebola", "sal (a gosto)".
export function agruparTemperos(
  receitas: RecipeWithIngredients[]
): { label: string }[] {
  const mapa = new Map<
    string,
    { nome: string; total: number; temNumero: boolean; aGosto: boolean }
  >();
  receitas.forEach((r) => {
    (r.seasonings ?? []).forEach((s) => {
      const nome = s.name.trim();
      if (!nome) return;
      const chave = normalizarNome(nome);
      const atual =
        mapa.get(chave) ??
        { nome, total: 0, temNumero: false, aGosto: false };
      if (s.quantity != null && s.quantity > 0) {
        atual.total += s.quantity;
        atual.temNumero = true;
      } else {
        atual.aGosto = true;
      }
      mapa.set(chave, atual);
    });
  });

  return Array.from(mapa.values()).map((t) => {
    if (t.temNumero) {
      const qtd = Number.isInteger(t.total)
        ? String(t.total)
        : t.total.toFixed(1).replace(".", ",");
      return { label: `${qtd}× ${t.nome}` };
    }
    return { label: `${t.nome} (a gosto)` };
  });
}

// Uma "escolha" já agrupada (as linhas do mesmo choice_group viram um slot).
export interface RecipeChoice {
  group: number;
  label: string;
  cooked_grams_per_marmita: number;
  food_ids: string[];
  is_principal: boolean;
}

// Separa os ingredientes de uma receita em fixos (choice_group null) e escolhas
// (agrupadas por choice_group). Usado no form, no seletor e ao montar a semana.
export function agruparIngredientes(ings: RecipeIngredient[]): {
  fixos: RecipeIngredient[];
  escolhas: RecipeChoice[];
} {
  const fixos = ings.filter((i) => i.choice_group == null);
  const map = new Map<number, RecipeChoice>();
  ings.forEach((i) => {
    if (i.choice_group == null) return;
    const existente = map.get(i.choice_group);
    if (existente) {
      existente.food_ids.push(i.food_id);
      if (i.is_principal) existente.is_principal = true;
    } else {
      map.set(i.choice_group, {
        group: i.choice_group,
        label: i.choice_label ?? "Escolha",
        cooked_grams_per_marmita: i.cooked_grams_per_marmita,
        food_ids: [i.food_id],
        is_principal: !!i.is_principal,
      });
    }
  });
  const escolhas = Array.from(map.values()).sort((a, b) => a.group - b.group);
  return { fixos, escolhas };
}

// Um ingrediente fixo ao criar/editar uma receita: aponta para um alimento e
// diz quantos gramas prontos entram por marmita.
export interface RecipeIngredientInput {
  food_id: string;
  cooked_grams_per_marmita: number;
  is_principal?: boolean;
}

// Um ingrediente "à escolha": um rótulo (ex.: "Carne"), as gramas e a lista de
// alimentos que podem ser escolhidos ao usar a receita numa semana.
export interface RecipeChoiceInput {
  label: string;
  cooked_grams_per_marmita: number;
  food_ids: string[];
  is_principal?: boolean;
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
  choices: RecipeChoiceInput[];
  seasonings: RecipeSeasoningInput[];
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

// ---- Compartilhamento por link ----

// Prévia de uma receita compartilhada (alimentos desnormalizados).
export interface SharedRecipePreview {
  title: string;
  steps: string[];
  total_time_min: number | null;
  pressure_time_min: number | null;
  yield_marmitas: number | null;
  prep_notes: string | null;
  owner_name: string;
  ingredients: Array<{
    cooked_grams_per_marmita: number;
    choice_group: number | null;
    choice_label: string | null;
    is_principal: boolean;
    food: {
      name: string;
      category: string;
      fc: number;
      kcal_per_100g: number;
      protein_g_per_100g: number;
      carb_g_per_100g: number;
      fat_g_per_100g: number;
    };
  }>;
  seasonings?: { name: string; quantity: number | null }[];
}

export async function getSharedRecipe(code: string): Promise<SharedRecipePreview> {
  const res = await fetch(`/api/recipes/shared/${code}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao carregar receita compartilhada");
  }
  return res.json();
}

export async function importSharedRecipe(
  code: string
): Promise<{ id: string; title: string }> {
  const res = await fetch("/api/recipes/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao importar receita");
  }
  return res.json();
}
