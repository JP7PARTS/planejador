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

// Categorias válidas (mesmas do resto do site).
export const CATEGORIAS_VALIDAS = [
  "carbo",
  "proteina",
  "vegetal",
  "fruta",
  "outro",
] as const;

// Cabeçalhos do template (amigáveis, em português).
export const TEMPLATE_HEADERS = [
  "Nome",
  "Categoria",
  "kcal (por 100g)",
  "Proteína (g)",
  "Carboidrato (g)",
  "Gordura (g)",
  "Fator de Cocção",
];

const TEMPLATE_EXAMPLES = [
  ["Frango grelhado", "proteina", 165, 31, 0, 3.6, 1.0],
  ["Arroz cozido", "carbo", 130, 2.7, 28, 0.3, 3.0],
  ["Brócolis cozido", "vegetal", 34, 2.8, 7, 0.4, 2.0],
];

// Gera um Excel (.xlsx) de verdade — abre com as colunas separadas e traz um
// dropdown (validação de dados) na coluna Categoria com as opções do site.
export async function downloadTemplate(): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Alimentos");

  sheet.addRow(TEMPLATE_HEADERS);
  TEMPLATE_EXAMPLES.forEach((ex) => sheet.addRow(ex));

  // Estilo do cabeçalho.
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFE7D8" },
    };
  });

  // Larguras.
  sheet.columns.forEach((col, i) => {
    col.width = i === 0 ? 24 : 16;
  });

  // Dropdown de Categoria (coluna B) da linha 2 até a 1000.
  const lista = `"${CATEGORIAS_VALIDAS.join(",")}"`;
  for (let r = 2; r <= 1000; r++) {
    sheet.getCell(`B${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [lista],
      showErrorMessage: true,
      errorTitle: "Categoria inválida",
      error: "Escolha: carbo, proteina, vegetal, fruta ou outro.",
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "alimentos-modelo.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
