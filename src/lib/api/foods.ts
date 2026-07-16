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
  "gordura",
  "molho",
  "outro",
] as const;

// Mapeamento de código interno → nome amigável (exibido no site e na planilha).
export const CATEGORIAS_LABELS: Record<string, string> = {
  carbo: "Carboidrato",
  proteina: "Proteína",
  vegetal: "Vegetal",
  fruta: "Fruta",
  gordura: "Gordura",
  molho: "Molho/Tempero",
  outro: "Outro",
};

// Cabeçalhos do template (amigáveis, em português).
export const TEMPLATE_HEADERS = [
  "Nome",
  "Nome de compra",
  "Categoria",
  "kcal (por 100g)",
  "Proteína (g)",
  "Carboidrato (g)",
  "Gordura (g)",
  "Fator de Cocção",
];

const TEMPLATE_EXAMPLES = [
  ["Acém cozido", "Acém", "Proteína", 215, 27, 0, 12, 0.7],
  ["Acém grelhado", "Acém", "Proteína", 220, 29, 0, 11, 0.72],
  ["Arroz cozido", "Arroz", "Carboidrato", 130, 2.7, 28, 0.3, 3.0],
  ["Brócolis cozido", "Brócolis", "Vegetal", 34, 2.8, 7, 0.4, 2.0],
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

  // Dropdown de Categoria (coluna C) da linha 2 até a 1000.
  const categoriesDisplay = CATEGORIAS_VALIDAS.map((c) => CATEGORIAS_LABELS[c]);
  const lista = `"${categoriesDisplay.join(",")}"`;
  for (let r = 2; r <= 1000; r++) {
    sheet.getCell(`C${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [lista],
      showErrorMessage: true,
      errorTitle: "Categoria inválida",
      error: `Escolha: ${categoriesDisplay.join(", ")}.`,
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  baixarArquivo(blob, "alimentos-modelo.xlsx");
}

// Dispara o download de um Blob (padrão nativo, sem dependências).
function baixarArquivo(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Gera o mesmo modelo em CSV (mais leve, abre em qualquer editor). Usa `;` como
// separador (Excel pt-BR abre em colunas) + BOM UTF-8 (acentos corretos no
// Excel) + vírgula decimal nos exemplos (amigável pt-BR; o parser aceita ambos).
export function downloadCsvTemplate(): void {
  const escapar = (v: string | number): string => {
    let s = typeof v === "number" ? String(v).replace(".", ",") : v;
    // Aspas se o texto tiver o separador, aspas ou quebra de linha.
    if (/[";\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const linhas = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES].map((linha) =>
    linha.map(escapar).join(";")
  );
  const csv = "﻿" + linhas.join("\r\n") + "\r\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  baixarArquivo(blob, "alimentos-modelo.csv");
}
