// Tipos compartilhados entre o app e o banco de dados.

export interface Food {
  id: string;
  user_id: string;
  name: string;
  category: "carbo" | "proteina" | "vegetal" | "fruta" | "outro";
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carb_g_per_100g: number;
  fat_g_per_100g: number;
  fc: number; // fator de cocção (cru → pronto)
  created_at: string;
}

export interface Week {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  num_marmitas: number;
  is_favorite: boolean;
  is_shared: boolean;
  person2_name: string | null;
  num_marmitas_p2: number;
  household_id: string | null;
  extras: string[];
  created_at: string;
  updated_at: string;
}

export interface WeekItemDB {
  id: string;
  week_id: string;
  food_id: string;
  cooked_grams_per_marmita: number;
  num_marmitas: number;
  person: number; // 1 = você, 2 = a 2ª pessoa
  created_at: string;
}

// Receita/prato reutilizável: um combo de ingredientes (cada um aponta para um
// alimento) + modo de preparo. Ao usar numa semana, os ingredientes viram
// itens normais e entram na nutrição e na lista de compras.
export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  steps: string[]; // passos do modo de preparo, um por item
  total_time_min: number | null;
  pressure_time_min: number | null;
  yield_marmitas: number | null; // rende quantas marmitas (informativo)
  prep_notes: string | null; // dicas de "preparar antes"
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  food_id: string;
  cooked_grams_per_marmita: number;
  // Ingrediente "à escolha": linhas com o mesmo choice_group/choice_label são
  // opções de um mesmo slot (ex.: "Carne"). NULL = ingrediente fixo.
  choice_group: number | null;
  choice_label: string | null;
  created_at: string;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

// Tipos para importação em massa de alimentos
export interface ImportFood {
  name: string;
  category: "carbo" | "proteina" | "vegetal" | "fruta" | "outro";
  kcal_per_100g?: number;
  protein_g_per_100g?: number;
  carb_g_per_100g?: number;
  fat_g_per_100g?: number;
  fc?: number;
}

export interface BulkImportError {
  row: number;
  field: string;
  value: string;
  error: string;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors?: BulkImportError[];
}

// Tipos para Refeições/Eventos (janta com 7 pessoas, almoço, etc.)
export interface Event {
  id: string;
  user_id: string;
  title: string;
  event_date: string | null;
  base_people_count: number;
  created_at: string;
  updated_at: string;
}

export interface EventRecipe {
  id: string;
  event_id: string;
  recipe_id: string;
  people_count: number;
  order_index: number;
  created_at: string;
  // Escolhas resolvidas: choice_group → food_id selecionado. Ausente/vazio = 1ª opção.
  choices?: Record<string, string>;
  recipe?: RecipeWithIngredients; // populated quando necessário
}

export interface EventWithRecipes extends Event {
  event_recipes: EventRecipe[];
}

export interface ShoppingItem {
  food_id: string;
  food_name: string;
  category: string;
  quantity_grams: number; // em cru
  quantity_kg: number; // conveniência
}
