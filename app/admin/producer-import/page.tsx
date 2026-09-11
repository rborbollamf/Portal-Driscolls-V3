"use client";

import { ChangeEvent, useMemo, useState } from "react";

type Issue = { row?: number; field?: string; code?: string; message: string };
type PreviewRow = Record<string, string | number | null>;
type RejectedRow = { row: number; values: Record<string, string>; errors: Issue[] };
type ValidationResult = {
  rows?: PreviewRow[];
  preview?: PreviewRow[];
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  errors?: Issue[];
  warnings?: Issue[];
  rejectedRows?: RejectedRow[];
  rejectionCsv?: string;
  token?: string;
};

const columns = [
  "Cultivo", "Distrito", "Growing Area Name", "Productor (Grower)", "COFIBE/ ID CG",
  "Grower #", "Razón Social (Company name)", "Representante Legal (Administrator)",
  "Dirección Fiscal (Address)", "Colonia", "Municipio", "Estado", "Zip Code",
  "RFC (Tax ID)", "Contact", "Telephone number", "Cellular number", "Email",
  "Email productor",
];
type ImportResult = { received?: number; created?: number; updated?: number; rejected?: number };

export default function ProducerImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"all-or-nothing" | "valid-only">("all-or-nothing");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [busy, setBusy] = useState<"validate" | "import" | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  const hasErrors = Boolean(result?.errors?.some((issue) => issue.code !== "EXISTING_RFC"));
  const canImport = Boolean(file && result && !busy && (mode === "valid-only" || !hasErrors));
  const preview = useMemo(() => (result?.rows ?? []).slice(0, 20), [result]);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setMessage(null);
    setImportResult(null);
  };

  const validate = async () => {
    if (!file) return;
    setBusy("validate");
    setMessage(null);
    setResult(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/admin/producers/import/validate", { method: "POST", body });
      const data = (await response.json()) as ValidationResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo validar el archivo.");
      const errors = (data.errors ?? []).filter((issue) => issue.code !== "EXISTING_RFC");
      const warnings = [...(data.warnings ?? []), ...(data.errors ?? []).filter((issue) => issue.code === "EXISTING_RFC")];
      const totalRows = data.totalRows ?? data.rows?.length ?? data.preview?.length ?? 0;
      const invalidRows = data.invalidRows ?? new Set(errors.map((issue) => issue.row).filter((row): row is number => row !== undefined && row > 1)).size;
      setResult({
        ...data,
        rows: data.preview ?? data.rows,
        totalRows,
        validRows: data.validRows ?? Math.max(0, totalRows - invalidRows),
        invalidRows,
        warnings,
        errors,
      });
      setMessage({ text: "Validación terminada. Revisa la vista previa antes de importar.", tone: "success" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo validar el archivo.", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const importFile = async () => {
    if (!file || !result) return;
    setBusy("import");
    setMessage(null);
    const body = new FormData();
    body.append("file", file);
    body.append("mode", mode === "valid-only" ? "VALID_ONLY" : "ALL_OR_NOTHING");
    if (result.token) body.append("validationToken", result.token);
    try {
      const response = await fetch("/api/admin/producers/import", { method: "POST", body });
      const data = (await response.json()) as ImportResult & { imported?: number; error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo completar la importación.");
      const summary = { ...data, received: data.received ?? result.totalRows, created: data.created ?? 0, updated: data.updated ?? 0, rejected: data.rejected ?? 0 };
      setImportResult(summary);
      setMessage({ text: "Importación completada correctamente.", tone: "success" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo completar la importación.", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const downloadRejections = () => {
    if (result?.rejectionCsv) {
      const url = URL.createObjectURL(new Blob([result.rejectionCsv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "rechazos-productores.csv"; anchor.click(); URL.revokeObjectURL(url);
      return;
    }
    if (!result?.rejectedRows?.length) return;
    void (async () => {
      const response = await fetch("/api/admin/producers/import/rejections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: result.rejectedRows }),
      });
      if (!response.ok) return;
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "rechazos-productores.csv"; anchor.click(); URL.revokeObjectURL(url);
    })();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="border-b border-gray-200 pb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-driscoll-green">Administración / Datos</p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Importar productores</h1>
        <p className="mt-2 max-w-2xl text-gray-600">Carga un archivo XLSX o CSV, valida sus registros y confirma la incorporación con una decisión explícita sobre los datos no válidos.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-semibold text-gray-900">1. Selecciona el archivo</h2><p className="mt-1 text-sm text-gray-500">CSV UTF-8 o Excel (.xlsx), hasta 25 MB.</p></div>
            <a href="/api/admin/producers/import/template" className="text-sm font-semibold text-driscoll-green underline underline-offset-4">Descargar plantilla</a>
          </div>
          <label htmlFor="producer-file" className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-5 text-center transition hover:border-driscoll-green hover:bg-green-50">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-driscoll-green text-xl font-bold text-white">+</span>
            <span className="font-semibold text-gray-800">{file ? file.name : "Elige un archivo CSV o XLSX"}</span>
            <span className="mt-1 text-sm text-gray-500">{file ? `${(file.size / 1024).toFixed(1)} KB seleccionados` : "o arrástralo aquí"}</span>
            <input id="producer-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={chooseFile} className="sr-only" />
          </label>
          <button type="button" onClick={() => void validate()} disabled={!file || busy !== null} className="mt-5 w-full rounded-md bg-driscoll-green px-4 py-3 text-sm font-bold text-white transition hover:bg-driscoll-darkgreen disabled:cursor-not-allowed disabled:opacity-45">
            {busy === "validate" ? "Validando archivo..." : "Validar archivo"}
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-[#f8faf5] p-6">
          <h2 className="text-lg font-semibold text-gray-900">2. Modo de importación</h2>
          <p className="mt-1 text-sm text-gray-500">Esta elección se conserva para la confirmación.</p>
          <div className="mt-5 space-y-3">
            {[
              ["all-or-nothing", "Todo o nada", "Si existe un error, no se importa ningún registro."],
              ["valid-only", "Solo registros válidos", "Importa los registros correctos y entrega un archivo de rechazos."],
            ].map(([value, title, description]) => (
              <label key={value} className={`block cursor-pointer rounded-lg border p-4 transition ${mode === value ? "border-driscoll-green bg-white ring-1 ring-driscoll-green" : "border-gray-200 bg-white/60 hover:border-gray-300"}`}>
                <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value as typeof mode)} className="mr-3 accent-[#287b45]" />
                <span className="font-semibold text-gray-900">{title}</span>
                <span className="mt-1 block pl-6 text-sm text-gray-600">{description}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {message && <div role="alert" className={`rounded-lg border px-4 py-3 text-sm ${message.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>{message.text}</div>}

      {result && (
        <section className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Total recibido", result.totalRows ?? 0, "text-gray-900"], ["Registros válidos", result.validRows ?? 0, "text-driscoll-green"], ["Registros con error", result.invalidRows ?? 0, "text-red-700"], ["Advertencias", result.warnings?.length ?? 0, "text-amber-700"]].map(([label, value, color]) => <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div>)}
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Vista previa</h2><p className="text-sm text-gray-500">Mostrando hasta 20 registros del archivo.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{preview.length} filas</span></div>
            <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500"><tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-semibold">{column}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{preview.map((row, index) => <tr key={index} className="hover:bg-gray-50">{columns.map((column) => <td key={column} className="whitespace-nowrap px-4 py-3 text-gray-700">{String(row[column] ?? "—")}</td>)}</tr>)}</tbody></table></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <IssueList title="Errores que bloquean" issues={result.errors ?? []} tone="error" />
            <IssueList title="Advertencias a revisar" issues={result.warnings ?? []} tone="warning" />
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold text-gray-900">3. Confirma la importación</h2><p className="text-sm text-gray-500">{mode === "all-or-nothing" && hasErrors ? "Corrige los errores para continuar con este modo." : "La acción registrará los cambios en la bitácora administrativa."}</p>{importResult && <p className="mt-3 text-sm font-medium text-driscoll-green">Recibidos: {importResult.received ?? 0} · Creados: {importResult.created ?? 0} · Actualizados: {importResult.updated ?? 0} · Rechazados: {importResult.rejected ?? 0}</p>}</div>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={downloadRejections} disabled={!result.rejectionCsv && !result.rejectedRows?.length} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Descargar rechazos</button><button type="button" onClick={() => void importFile()} disabled={!canImport} className="rounded-md bg-driscoll-green px-5 py-2 text-sm font-bold text-white hover:bg-driscoll-darkgreen disabled:cursor-not-allowed disabled:opacity-45">{busy === "import" ? "Importando..." : "Confirmar importación"}</button></div>
          </div>
        </section>
      )}
    </div>
  );
}

function IssueList({ title, issues, tone }: { title: string; issues: Issue[]; tone: "error" | "warning" }) {
  return <div className={`rounded-xl border p-5 ${tone === "error" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}><h3 className="font-semibold text-gray-900">{title} <span className="text-sm font-normal text-gray-500">({issues.length})</span></h3>{issues.length ? <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm text-gray-700">{issues.map((issue, index) => <li key={index} className="border-b border-black/5 pb-2 last:border-0">{issue.row ? `Fila ${issue.row}${issue.field ? ` · ${issue.field}` : ""}: ` : ""}{issue.message}</li>)}</ul> : <p className="mt-3 text-sm text-gray-600">No se encontraron {tone === "error" ? "errores" : "advertencias"}.</p>}</div>;
}