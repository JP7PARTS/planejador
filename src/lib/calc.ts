import { Food } from "./types";

export interface WeekItem {
  foodId: string;
  cookedGramsPerMarmita: number;
  numMarmitas: number;
  person?: 1 | 2; // opcional; usado só para dividir semana conjunta (calc ignora)
}

export interface WeekItemResult extends WeekItem {
  food: Food;
  rawPerMarmita: number;
  rawTotal: number;
  kcalPerMarmita: number;
  kcalTotal: number;
  proteinPerMarmita: number;
  proteinTotal: number;
  carbPerMarmita: number;
  carbTotal: number;
  fatPerMarmita: number;
  fatTotal: number;
}

export interface WeekSummary {
  items: WeekItemResult[];
  totalRawPerFood: Record<string, number>;
  totalKcal: number;
  totalProtein: number;
  totalCarb: number;
  totalFat: number;
  avgKcalPerMarmita: number;
  avgProteinPerMarmita: number;
  avgCarbPerMarmita: number;
  avgFatPerMarmita: number;
}

export function rawPerMarmita(cookedGrams: number, fc: number): number {
  return cookedGrams / fc;
}

export function rawTotal(
  cookedGrams: number,
  fc: number,
  numMarmitas: number
): number {
  return rawPerMarmita(cookedGrams, fc) * numMarmitas;
}

export function nutritionPerCookedGrams(
  cookedGrams: number,
  valuePerHundredGrams: number
): number {
  return (cookedGrams / 100) * valuePerHundredGrams;
}

export function nutritionTotal(
  cookedGrams: number,
  valuePerHundredGrams: number,
  numMarmitas: number
): number {
  return nutritionPerCookedGrams(cookedGrams, valuePerHundredGrams) * numMarmitas;
}

export function calculateWeekItem(
  food: Food,
  cookedGramsPerMarmita: number,
  numMarmitas: number
): WeekItemResult {
  const rawPerM = rawPerMarmita(cookedGramsPerMarmita, food.fc);
  const rawTot = rawPerM * numMarmitas;

  const kcalPerM = nutritionPerCookedGrams(
    cookedGramsPerMarmita,
    food.kcal_per_100g
  );
  const kcalTot = kcalPerM * numMarmitas;

  const proteinPerM = nutritionPerCookedGrams(
    cookedGramsPerMarmita,
    food.protein_g_per_100g
  );
  const proteinTot = proteinPerM * numMarmitas;

  const carbPerM = nutritionPerCookedGrams(
    cookedGramsPerMarmita,
    food.carb_g_per_100g
  );
  const carbTot = carbPerM * numMarmitas;

  const fatPerM = nutritionPerCookedGrams(
    cookedGramsPerMarmita,
    food.fat_g_per_100g
  );
  const fatTot = fatPerM * numMarmitas;

  return {
    foodId: food.id,
    cookedGramsPerMarmita,
    numMarmitas,
    food,
    rawPerMarmita: rawPerM,
    rawTotal: rawTot,
    kcalPerMarmita: kcalPerM,
    kcalTotal: kcalTot,
    proteinPerMarmita: proteinPerM,
    proteinTotal: proteinTot,
    carbPerMarmita: carbPerM,
    carbTotal: carbTot,
    fatPerMarmita: fatPerM,
    fatTotal: fatTot,
  };
}

export function calculateWeekSummary(
  items: WeekItem[],
  foodsMap: Record<string, Food>,
  numMarmitas: number
): WeekSummary {
  const results: WeekItemResult[] = items
    .map((item) => {
      const food = foodsMap[item.foodId];
      if (!food) return null;
      return calculateWeekItem(food, item.cookedGramsPerMarmita, item.numMarmitas);
    })
    .filter((r): r is WeekItemResult => r !== null);

  const totalRawPerFood: Record<string, number> = {};
  results.forEach((r) => {
    totalRawPerFood[r.food.name] =
      (totalRawPerFood[r.food.name] ?? 0) + r.rawTotal;
  });

  const totalKcal = results.reduce((sum, r) => sum + r.kcalTotal, 0);
  const totalProtein = results.reduce((sum, r) => sum + r.proteinTotal, 0);
  const totalCarb = results.reduce((sum, r) => sum + r.carbTotal, 0);
  const totalFat = results.reduce((sum, r) => sum + r.fatTotal, 0);

  return {
    items: results,
    totalRawPerFood,
    totalKcal,
    totalProtein,
    totalCarb,
    totalFat,
    avgKcalPerMarmita: numMarmitas > 0 ? totalKcal / numMarmitas : 0,
    avgProteinPerMarmita: numMarmitas > 0 ? totalProtein / numMarmitas : 0,
    avgCarbPerMarmita: numMarmitas > 0 ? totalCarb / numMarmitas : 0,
    avgFatPerMarmita: numMarmitas > 0 ? totalFat / numMarmitas : 0,
  };
}
