import { Food, ImportFood, BulkImportResult } from "@/lib/types";

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

export async function bulkImportFoods(
  foods: ImportFood[],
  mode: "skip" | "update" = "skip"
): Promise<BulkImportResult> {
  const res = await fetch("/api/foods/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foods, mode }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao importar alimentos");
  }

  return res.json() as Promise<BulkImportResult>;
}

export function generateCsvTemplate(): string {
  const headers = [
    "Nome",
    "Categoria",
    "kcal_per_100g",
    "Proteína (g)",
    "Carboidrato (g)",
    "Gordura (g)",
    "Fator de Cocção",
  ];

  const examples = [
    [
      "Frango grelhado",
      "proteina",
      "165",
      "31",
      "0",
      "3.6",
      "1.0",
    ],
    [
      "Arroz cozido",
      "carbo",
      "130",
      "2.7",
      "28",
      "0.3",
      "3.0",
    ],
    [
      "Brócolis cozido",
      "vegetal",
      "34",
      "2.8",
      "7",
      "0.4",
      "2.0",
    ],
  ];

  const rows: string[] = [headers.map((h) => `"${h}"`).join(",")];

  examples.forEach((example) => {
    rows.push(example.map((v) => `"${v}"`).join(","));
  });

  rows.push("");
  rows.push('# Categorias válidas: carbo, proteina, vegetal, fruta, outro');
  rows.push('# Valores vazios: kcal e macros → 0; Fator de Cocção → 1.0');

  return rows.join("\n");
}

export function downloadCsvTemplate(): void {
  const csv = generateCsvTemplate();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", "alimentos-template.csv");
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
