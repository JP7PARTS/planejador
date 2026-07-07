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
