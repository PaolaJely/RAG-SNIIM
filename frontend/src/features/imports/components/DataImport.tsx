import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  analyzeImport,
  approveImport,
} from "../../../services/importService";
import type {
  ImportApproval,
  ImportFormMetadata,
  ImportPreview,
  ImportRowStatus,
} from "../../../types/imports";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MONTHS = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const initialMetadata: ImportFormMetadata = {
  producerName: "",
  municipality: "",
  currency: "MXN",
  packageWeightKg: "",
  adminToken: "",
};

function StatusBadge({ status }: { status: ImportRowStatus }) {
  const styles = {
    valid: "bg-brand-success-muted text-brand-success",
    warning: "bg-brand-warning-muted text-brand-warning",
    error: "bg-brand-danger-muted text-brand-danger",
  };
  const labels = { valid: "Válida", warning: "Revisar", error: "Error" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function DataImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approval, setApproval] = useState<ImportApproval | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectFile = (candidate?: File) => {
    if (!candidate) return;
    const extension = candidate.name.split(".").pop()?.toLowerCase();
    if (!extension || !["xlsx", "csv"].includes(extension)) {
      setError("Selecciona un archivo .xlsx o .csv.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError("El archivo excede el límite de 10 MB.");
      return;
    }
    setFile(candidate);
    setPreview(null);
    setApproval(null);
    setError(null);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const analyze = async () => {
    if (!file) return;
    if (!metadata.producerName.trim()) {
      setError("Indica el nombre del productor antes de analizar el archivo.");
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    setApproval(null);
    try {
      setPreview(await analyzeImport(file, metadata));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible analizar el archivo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    if (!preview?.batch_id) return;
    const excludeErrors = preview.summary.error_rows > 0;
    const message = excludeErrors
      ? `Se importarán ${preview.summary.total_rows - preview.summary.error_rows} filas y se excluirán ${preview.summary.error_rows} con errores. ¿Continuar?`
      : `Se importarán ${preview.summary.total_rows} filas en Neon. ¿Continuar?`;
    if (!window.confirm(message)) return;

    setApproving(true);
    setError(null);
    try {
      setApproval(await approveImport(
        preview.batch_id,
        excludeErrors,
        metadata.adminToken,
      ));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible aprobar la importación.",
      );
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-5 lg:p-7 xl:p-8">
      <header>
        <h1 className="text-lg font-semibold text-foreground">
          Importar datos de productores
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Normaliza archivos Excel o CSV y revisa los datos antes de guardarlos.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="space-y-4 rounded-xl border border-border bg-surface-raised p-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">1. Archivo</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Formatos permitidos: XLSX y CSV · máximo 10 MB
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={onInputChange}
            className="sr-only"
          />
          <div
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={[
              "flex min-h-44 flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 text-center transition-colors",
              dragging
                ? "border-brand bg-brand-muted/30"
                : "border-border bg-surface hover:border-brand/40",
            ].join(" ")}
          >
            {file ? (
              <>
                <FileSpreadsheet className="mb-3 h-9 w-9 text-brand" />
                <p className="max-w-full truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setApproval(null);
                  }}
                  className="mt-3 flex items-center gap-1 text-xs text-brand-danger hover:underline"
                >
                  <X className="h-3 w-3" /> Quitar archivo
                </button>
              </>
            ) : (
              <>
                <UploadCloud className="mb-3 h-9 w-9 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Arrastra el archivo aquí
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-2 text-xs font-medium text-brand hover:underline"
                >
                  o selecciónalo desde tu equipo
                </button>
              </>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              2. Metadatos del origen
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Productor
                <input
                  value={metadata.producerName}
                  onChange={(event) =>
                    setMetadata({ ...metadata, producerName: event.target.value })
                  }
                  placeholder="Nombre del productor"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Municipio
                <input
                  value={metadata.municipality}
                  onChange={(event) =>
                    setMetadata({ ...metadata, municipality: event.target.value })
                  }
                  placeholder="Municipio o localidad"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Moneda
                <select
                  value={metadata.currency}
                  onChange={(event) =>
                    setMetadata({ ...metadata, currency: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Peso por caja (kg)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={metadata.packageWeightKg}
                  onChange={(event) =>
                    setMetadata({ ...metadata, packageWeightKg: event.target.value })
                  }
                  placeholder="Ej. 18"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50"
                />
              </label>
              <label className="text-xs text-muted-foreground sm:col-span-2">
                Token administrativo
                <input
                  type="password"
                  autoComplete="off"
                  value={metadata.adminToken}
                  onChange={(event) =>
                    setMetadata({ ...metadata, adminToken: event.target.value })
                  }
                  placeholder="Requerido en producción"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg border border-brand-danger/20 bg-brand-danger-muted p-3 text-xs text-brand-danger">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={!file || loading}
            onClick={analyze}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analizando archivo</>
            ) : (
              <><FileSpreadsheet className="h-4 w-4" /> Analizar y normalizar</>
            )}
          </button>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-surface-raised p-5">
          {!preview ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center text-center">
              <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <h2 className="text-sm font-medium text-foreground">
                Vista previa de importación
              </h2>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Selecciona un archivo para detectar su estructura, normalizar las
                columnas e identificar registros que requieren revisión.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Vista previa normalizada
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {preview.sheet} · {preview.metadata.title ?? preview.filename}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {preview.agent_used && (
                    <span className="rounded-md bg-purple-500/10 px-2 py-1 text-[10px] font-medium text-purple-600">
                      Mapeado por agente
                    </span>
                  )}
                  <span className="rounded-md bg-brand-muted px-2 py-1 text-[10px] font-medium text-brand">
                    Lote #{preview.batch_id}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Registros", preview.summary.total_rows, "text-foreground"],
                  ["Válidos", preview.summary.valid_rows, "text-brand-success"],
                  ["Revisar", preview.summary.warning_rows, "text-brand-warning"],
                  ["Errores", preview.summary.error_rows, "text-brand-danger"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="rounded-lg bg-surface p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {preview.issues.length > 0 && (
                <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-surface p-2">
                  {preview.issues.map((issue, index) => (
                    <div
                      key={`${issue.row}-${issue.code}-${index}`}
                      className="flex items-start gap-2 rounded-md bg-surface-raised px-2 py-1.5 text-xs"
                    >
                      {issue.severity === "error" ? (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-danger" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-warning" />
                      )}
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {issue.source_year_block
                            ? `${issue.source_year_block} · fila ${issue.row}:`
                            : `Fila ${issue.row}:`}
                        </span>{" "}
                        {issue.message}
                        {issue.suggestion != null && (
                          <span className="text-brand">
                            {" "}Sugerencia: {String(issue.suggestion)}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
                <table className="w-full min-w-[720px] border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-surface-secondary text-muted-foreground">
                    <tr>
                      {["Estado", "Fila", "Fecha", "Semana", "Mes", "Producto", "Calidad", "Precio"].map((heading) => (
                        <th key={heading} className="border-b border-border px-3 py-2 text-left font-medium">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, index) => (
                      <tr key={`${row.source_year_block}-${row.source_row}-${index}`} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                        <td className="px-3 py-2 text-muted-foreground">{row.source_row}</td>
                        <td className="px-3 py-2 text-foreground">{row.record_date ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.iso_week ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.month ? MONTHS[row.month] : "—"}</td>
                        <td className="px-3 py-2 text-foreground">{row.product_name ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.quality ?? "—"}</td>
                        <td className="px-3 py-2 font-medium text-foreground">
                          {row.price != null ? `${row.currency} ${row.price.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {approval ? (
                <div className="flex items-start gap-2 rounded-lg border border-brand-success/20 bg-brand-success-muted p-3 text-xs text-brand-success">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  Importación completada: {approval.imported_rows} registros
                  publicados para el productor #{approval.producer_id}.
                  {approval.excluded_error_rows > 0 &&
                    ` Se excluyeron ${approval.excluded_error_rows} filas con errores.`}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-brand/15 bg-brand-muted/25 p-3 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    El análisis se guardó en staging de Neon como lote
                    #{preview.batch_id}. Los precios aún no están publicados.
                  </div>
                  <button
                    type="button"
                    onClick={approve}
                    disabled={approving}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-success px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {approving ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Importando</>
                    ) : preview.summary.error_rows > 0 ? (
                      `Aprobar ${preview.summary.total_rows - preview.summary.error_rows} filas sin errores`
                    ) : (
                      `Aprobar e importar ${preview.summary.total_rows} filas`
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
