"use client";

import {
  bulkImportFoods,
  downloadTemplate,
  downloadCsvTemplate,
} from "@/lib/api/foods";
import { ImportFood, BulkImportError } from "@/lib/types";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useState } from "react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

type Phase = "select" | "preview" | "duplicates";

const CATEGORIAS = [
  "carbo",
  "proteina",
  "vegetal",
  "fruta",
  "gordura",
  "molho",
  "outro",
];

// Mapeamento de nomes amigáveis → código interno (normalizado)
const CATEGORIA_MAPPER: Record<string, string> = {
  carbo: "carbo",
  carboidrato: "carbo",
  proteina: "proteina",
  vegetal: "vegetal",
  fruta: "fruta",
  gordura: "gordura",
  molho: "molho",
  molhotempero: "molho",
  tempero: "molho",
  outro: "outro",
};

// Converte um valor de categoria (amigável ou código) para código interno
function normalizeCategoryValue(cat: string): string {
  const normalized = normalizeKey(cat);
  return CATEGORIA_MAPPER[normalized] || normalized;
}

// Normaliza um texto de cabeçalho: minúsculas, sem acento, sem pontuação.
function normalizeKey(k: string): string {
  return k
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Mapeia uma linha (com cabeçalhos em português OU em inglês) para os campos
// internos do alimento. Aceita várias grafias para cada coluna.
function mapRow(row: Record<string, unknown>): {
  name: string;
  shopping_name: string;
  category: string;
  kcal: string;
  protein: string;
  carb: string;
  fat: string;
  fc: string;
} {
  const norm: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    norm[normalizeKey(key)] = value;
  }

  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = norm[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return "";
  };

  return {
    name: pick("nome", "name", "alimento"),
    shopping_name: pick(
      "nomedecompra",
      "nomecompra",
      "shoppingname",
      "compra"
    ),
    category: pick("categoria", "category", "cat"),
    kcal: pick("kcalpor100g", "kcalper100g", "kcal", "calorias", "caloria"),
    protein: pick("proteinag", "proteina", "protein", "proteingper100g"),
    carb: pick("carboidratog", "carboidrato", "carbo", "carb", "carbgper100g"),
    fat: pick("gordurag", "gordura", "fat", "fatgper100g"),
    fc: pick("fatordecoccao", "fc", "fatorcoccao", "fator"),
  };
}

// Converte texto numérico (aceitando vírgula decimal, ex.: "3,6") em número.
function parseNum(v: string, fallback: number): number {
  if (!v) return fallback;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

interface PreviewRow {
  rowNumber: number;
  data: ImportFood;
  isDuplicate: boolean;
  error?: BulkImportError;
}

export default function AlimentosImport({ onClose, onSuccess }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [errors, setErrors] = useState<BulkImportError[]>([]);
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [duplicatesToUpdate, setDuplicatesToUpdate] = useState<Set<number>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMessage(null);
    }
  }

  async function handlePreview() {
    if (!selectedFile) return;

    setLoading(true);
    try {
      let foods: unknown[] = [];

      if (selectedFile.name.endsWith(".csv")) {
        // Parse CSV — skipEmptyLines ignora linhas em branco; o separador
        // (vírgula ou ponto-e-vírgula) é autodetectado pelo Papa.
        const text = await selectedFile.text();
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        });
        foods = parsed.data.filter(
          (row: unknown) =>
            row &&
            Object.values(row as Record<string, unknown>).some(
              (v) => v !== undefined && v !== null && String(v).trim() !== ""
            )
        );
      } else if (
        selectedFile.name.endsWith(".xlsx") ||
        selectedFile.name.endsWith(".xls")
      ) {
        // Parse Excel
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        foods = XLSX.utils.sheet_to_json(sheet);
      } else {
        setMessage({ type: "error", text: "Formato não suportado. Use CSV ou Excel." });
        setLoading(false);
        return;
      }

      // Validar cada linha
      const previewRows: PreviewRow[] = [];
      const validationErrors: BulkImportError[] = [];
      const existingNames = new Set<string>();

      // Buscar alimentos existentes do usuário (esta é uma abordagem otimista;
      // em produção, você faria fetch ao servidor antes de mostrar preview)
      // Por enquanto, vamos validar apenas na submissão

      foods.forEach((food, idx) => {
        const row = idx + 2; // +2 porque linha 1 é header, e 0-indexed
        const item = mapRow(food as Record<string, unknown>);
        const name = item.name;
        const category = normalizeCategoryValue(item.category);

        if (!name || !CATEGORIAS.includes(category)) {
          const error: BulkImportError = {
            row,
            field: !name ? "name" : "category",
            value: !name ? item.name : item.category,
            error: !name ? "Nome é obrigatório" : "Categoria inválida",
          };
          validationErrors.push(error);
          return;
        }

        const lowerName = name.toLowerCase();
        const isDuplicate = existingNames.has(lowerName);
        existingNames.add(lowerName);

        const importFood: ImportFood = {
          name,
          shopping_name: item.shopping_name || null,
          category: category as ImportFood["category"],
          kcal_per_100g: parseNum(item.kcal, 0),
          protein_g_per_100g: parseNum(item.protein, 0),
          carb_g_per_100g: parseNum(item.carb, 0),
          fat_g_per_100g: parseNum(item.fat, 0),
          fc: parseNum(item.fc, 1),
        };

        previewRows.push({
          rowNumber: row,
          data: importFood,
          isDuplicate,
        });
      });

      setPreview(previewRows);
      setErrors(validationErrors);

      if (validationErrors.length === 0 && previewRows.length > 0) {
        // Avançar para preview/duplicatas
        setPhase("preview");
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: `Erro ao processar arquivo: ${err instanceof Error ? err.message : "desconhecido"}`,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setLoading(true);
    setMessage(null);

    try {
      const foodsToImport = preview
        .filter((row) => !row.error)
        .map((row) => row.data);

      const actualMode =
        mode === "update" && preview.some((r) => r.isDuplicate) ? "update" : "skip";

      const result = await bulkImportFoods(foodsToImport, actualMode);

      if (result.imported > 0 || result.updated > 0) {
        setMessage({
          type: "success",
          text: `✅ ${result.imported} importados, ${result.updated} atualizados, ${result.skipped} pulados`,
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setMessage({
          type: "error",
          text: "Nenhum alimento foi importado",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: `Erro: ${err instanceof Error ? err.message : "desconhecido"}`,
      });
    } finally {
      setLoading(false);
    }
  }

  const hasErrors = errors.length > 0;
  const hasDuplicates = preview.some((r) => r.isDuplicate);
  const canImport = !hasErrors && preview.length > 0;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(38,34,28,0.5)] p-[18px] backdrop-blur-[3px]">
      <div className="max-h-[85vh] w-full max-w-[600px] overflow-y-auto rounded-[22px] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.5)] dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[21px] font-bold tracking-tight">
            {phase === "select"
              ? "Importar Alimentos"
              : phase === "preview"
              ? "Preview"
              : "Confirmar Duplicatas"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-[9px] bg-[#EFE7D8] px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:brightness-95 dark:bg-slate-800 dark:text-slate-300"
          >
            ✕
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-[11px] p-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {phase === "select" && (
          <div className="flex flex-col gap-4">
            <p className="text-[13.5px] text-slate-500 dark:text-slate-400">
              Selecione um arquivo CSV ou Excel com seus alimentos. Ou baixe um
              modelo em branco para começar.
            </p>

            <div>
              <label className="mb-2 block text-[13px] font-semibold">
                Selecionar Arquivo
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="w-full rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] px-3 py-2.5 text-[14px] dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            {selectedFile && (
              <p className="text-[12px] text-slate-600 dark:text-slate-400">
                📄 {selectedFile.name}
              </p>
            )}

            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                Baixar modelo em branco:
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    void downloadTemplate();
                  }}
                  className="flex-1 rounded-xl border border-[#E2D7C4] bg-white px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  📊 Excel
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsvTemplate()}
                  className="flex-1 rounded-xl border border-[#E2D7C4] bg-white px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  📄 CSV
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePreview}
              disabled={!selectedFile || loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Processando..." : "Visualizar"}
            </button>
          </div>
        )}

        {phase === "preview" && (
          <div className="flex flex-col gap-4">
            {hasErrors && (
              <div className="rounded-[11px] bg-red-50 p-3 dark:bg-red-950/20">
                <p className="mb-2 text-[12px] font-semibold text-red-700 dark:text-red-300">
                  ❌ {errors.length} erro{errors.length === 1 ? "" : "s"}:
                </p>
                <div className="flex flex-col gap-1">
                  {errors.map((err, i) => (
                    <p
                      key={i}
                      className="text-[11px] text-red-600 dark:text-red-400"
                    >
                      Linha {err.row}: {err.field} — {err.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {!hasErrors && (
              <>
                <p className="text-[12.5px] text-slate-600 dark:text-slate-400">
                  {preview.length} alimento{preview.length === 1 ? "" : "s"} pronto
                  {preview.length === 1 ? "" : "s"} para importar.
                  {hasDuplicates
                    ? ` ${preview.filter((r) => r.isDuplicate).length} duplicata${preview.filter((r) => r.isDuplicate).length === 1 ? "" : "s"} encontrada${preview.filter((r) => r.isDuplicate).length === 1 ? "" : "s"}.`
                    : ""}
                </p>

                {hasDuplicates && (
                  <div className="rounded-[11px] bg-yellow-50 p-3 dark:bg-yellow-950/20">
                    <p className="mb-2 text-[12px] font-semibold text-yellow-700 dark:text-yellow-300">
                      ⚠️ Duplicatas encontradas
                    </p>
                    {preview
                      .filter((r) => r.isDuplicate)
                      .map((row) => (
                        <p
                          key={row.rowNumber}
                          className="text-[11px] text-yellow-600 dark:text-yellow-400"
                        >
                          Linha {row.rowNumber}: "{row.data.name}" já existe
                        </p>
                      ))}
                  </div>
                )}

                <div className="max-h-[200px] overflow-x-auto rounded-[11px] border border-[#E2D7C4] bg-[#FCFAF5] dark:border-slate-700 dark:bg-slate-800">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                      <tr>
                        <th className="px-2 py-1 text-left font-semibold">
                          #
                        </th>
                        <th className="px-2 py-1 text-left font-semibold">
                          Nome
                        </th>
                        <th className="px-2 py-1 text-left font-semibold">
                          Cat.
                        </th>
                        <th className="px-2 py-1 text-right font-semibold">
                          kcal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={
                            row.isDuplicate
                              ? "bg-yellow-50 dark:bg-yellow-950/20"
                              : ""
                          }
                        >
                          <td className="px-2 py-1 text-slate-500 dark:text-slate-400">
                            {row.rowNumber}
                          </td>
                          <td className="px-2 py-1">{row.data.name}</td>
                          <td className="px-2 py-1 uppercase">
                            {row.data.category.substring(0, 3)}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {row.data.kcal_per_100g}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasDuplicates && (
                  <div className="flex gap-2">
                    <input
                      type="checkbox"
                      id="update-mode"
                      checked={mode === "update"}
                      onChange={(e) =>
                        setMode(e.target.checked ? "update" : "skip")
                      }
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="update-mode"
                      className="text-[12px] font-medium text-slate-700 dark:text-slate-300"
                    >
                      Atualizar dados dos alimentos já existentes
                    </label>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPhase("select");
                  setPreview([]);
                  setErrors([]);
                  setSelectedFile(null);
                }}
                className="flex-1 rounded-xl border border-[#E2D7C4] bg-white px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport || loading}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
