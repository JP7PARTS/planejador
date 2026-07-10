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
  created_at: string;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}
