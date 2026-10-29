import React, { useEffect, useMemo, useState } from "react";
import { readSheet } from "read-excel-file/browser";
import writeExcelFile from "write-excel-file/browser";
import { employeeDirectory } from "../data/employeeDirectory";
import { importAttendance } from "../lib/api";
import { toast } from "../lib/feedback";
import { toDateKey, toDisplayDate, todayKey } from "../lib/format";

// Formato estándar de la planilla: una fila por fichaje.
//   Legajo | Fecha | Entrada | Salida
// Fecha en DD/MM/AAAA, horas en HH:MM (24 horas). La salida es opcional; si es
// anterior a la entrada se toma como del día siguiente (turno noche).

const headerAliases = {
  legajo: ["legajo", "nro legajo", "numero de legajo", "n legajo"],
  fecha: ["fecha", "dia", "fecha de entrada"],
  entrada: ["entrada", "hora de entrada", "hora entrada", "ingreso"],
  salida: ["salida", "hora de salida", "hora salida", "egreso"],
};

function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

// Fecha de una celda: objeto Date, número de serie de Excel o texto
function parseDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  if (typeof value === "number" && value > 20000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }
  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    const key = `${year}-${pad(match[2])}-${pad(match[1])}`;
    const date = new Date(`${key}T00:00:00`);
    return !Number.isNaN(date.getTime()) && toDateKey(date) === key ? key : null;
  }
  return null;
}

// Hora de una celda: texto HH:MM, fracción de día de Excel u objeto Date
function parseTime(value) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
  }
  if (typeof value === "number" && value >= 0 && value < 1) {
    const minutes = Math.round(value * 24 * 60);
    return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
  }
  const match = String(value).trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(hs)?$/i);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

function nextDay(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return toDateKey(date);
}

function parseCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim());
  const delimiter = (lines[0]?.match(/;/g)?.length ?? 0) >= (lines[0]?.match(/,/g)?.length ?? 0) ? ";" : ",";
  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

// Convierte las filas de la planilla en fichajes listos para importar
function buildRows(sheet) {
  const headerIndex = sheet.findIndex((row) => row.some((cell) => headerAliases.legajo.includes(normalize(cell))));
  if (headerIndex === -1) {
    throw new Error("No encontramos la fila de títulos. La planilla tiene que tener las columnas Legajo, Fecha, Entrada y Salida.");
  }
  const header = sheet[headerIndex].map(normalize);
  const column = Object.fromEntries(
    Object.entries(headerAliases).map(([key, aliases]) => [key, header.findIndex((title) => aliases.includes(title))]),
  );
  const missing = ["legajo", "fecha", "entrada"].filter((key) => column[key] === -1);
  if (missing.length) {
    throw new Error(`Faltan las columnas: ${missing.map((key) => key[0].toUpperCase() + key.slice(1)).join(", ")}.`);
  }

  const byNumber = new Map(employeeDirectory.map((employee) => [String(employee.id), employee]));
  return sheet
    .slice(headerIndex + 1)
    .map((cells, offset) => ({ cells, line: headerIndex + offset + 2 }))
    .filter(({ cells }) => cells.some((cell) => cell !== null && String(cell).trim() !== ""))
    .map(({ cells, line }) => {
      const legajo = String(cells[column.legajo] ?? "").trim().replace(/\.0+$/, "");
      const date = parseDate(cells[column.fecha]);
      const entry = parseTime(cells[column.entrada]);
      const exit = column.salida === -1 ? "" : parseTime(cells[column.salida]);
      const employee = byNumber.get(legajo);
      let problem = "";
      if (!legajo) problem = "Falta el legajo.";
      else if (!employee) problem = `No existe el legajo ${legajo}.`;
      else if (employee.employmentStatus === "inactive") problem = "El empleado está dado de baja.";
      else if (!date) problem = "La fecha no es válida (usá DD/MM/AAAA).";
      else if (date > todayKey()) problem = "La fecha es futura.";
      else if (!entry) problem = "La hora de entrada no es válida (usá HH:MM).";
      else if (exit === null) problem = "La hora de salida no es válida (usá HH:MM).";
      const exitDate = exit && entry && exit <= entry ? nextDay(date) : date;
      return {
        line,
        legajo,
        employee,
        date,
        entry,
        exit: exit || "",
        overnight: Boolean(exit && entry && exit <= entry),
        problem,
        payload: problem
          ? null
          : { fila: line, legajo, entrada: `${date}T${entry}`, salida: exit ? `${exitDate}T${exit}` : "" },
      };
    });
}

export async function downloadTemplate() {
  const sample = employeeDirectory.filter((employee) => employee.employmentStatus !== "inactive").slice(0, 3);
  const today = toDisplayDate(todayKey());
  const header = ["Legajo", "Fecha", "Entrada", "Salida"].map((value) => ({ value, fontWeight: "bold" }));
  const rows = (sample.length ? sample : [{ id: "1" }]).map((employee, index) => [
    { value: String(employee.id), type: String },
    { value: today, type: String },
    { value: ["09:00", "14:05", "22:00"][index] ?? "09:00", type: String },
    { value: ["17:00", "22:00", "06:00"][index] ?? "17:00", type: String },
  ]);
  await writeExcelFile([header, ...rows], { columns: [{ width: 12 }, { width: 14 }, { width: 10 }, { width: 10 }] }).toFile(
    "plantilla_fichajes.xlsx",
  );
}

export default function AttendanceImport({ onClose, onImported }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && !importing && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [importing, onClose]);

  const valid = useMemo(() => (rows ?? []).filter((row) => row.payload), [rows]);
  const resultByLine = useMemo(() => new Map((results ?? []).map((result) => [result.fila, result])), [results]);

  async function readFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setResults(null);
    setFileName(file.name);
    try {
      const sheet = /\.csv$/i.test(file.name) ? parseCsv(await file.text()) : await readSheet(file);
      const parsed = buildRows(sheet);
      if (!parsed.length) throw new Error("La planilla no tiene filas con fichajes.");
      if (parsed.length > 3000) throw new Error("Se pueden importar hasta 3000 filas por vez.");
      setRows(parsed);
    } catch (readError) {
      setRows(null);
      setError(
        /zip|xlsx|spreadsheet|invalid/i.test(readError.message) && !/columnas|títulos|filas/.test(readError.message)
          ? "No se pudo leer el archivo. Usá una planilla .xlsx o un .csv con el formato de la plantilla."
          : readError.message,
      );
    }
  }

  async function runImport() {
    setImporting(true);
    try {
      const response = await importAttendance(valid.map((row) => row.payload));
      setResults(response);
      const saved = response.filter((result) => result.ok).length;
      const failed = response.length - saved;
      if (saved) toast.success(`Se importaron ${saved} ${saved === 1 ? "fichaje" : "fichajes"}.`);
      if (failed) toast.error(`${failed} ${failed === 1 ? "fila no se pudo" : "filas no se pudieron"} importar. Revisá el detalle.`);
      onImported();
    } catch (importError) {
      toast.error(importError.message);
    } finally {
      setImporting(false);
    }
  }

  const skipped = (rows?.length ?? 0) - valid.length;

  return (
    <div
      aria-labelledby="import-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && !importing && onClose()}
      role="dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900" id="import-title">Importar fichajes desde una planilla</h2>
            <p className="mt-0.5 text-[0.625rem] text-slate-500">
              Columnas: <strong>Legajo</strong>, <strong>Fecha</strong> (DD/MM/AAAA), <strong>Entrada</strong> y{" "}
              <strong>Salida</strong> (HH:MM, 24 horas). La salida es opcional y, si es anterior a la entrada, se toma del día
              siguiente. Si ya hay un fichaje ese día, se reemplaza.
            </p>
          </div>
          <button
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            disabled={importing}
            onClick={onClose}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => downloadTemplate().catch((templateError) => toast.error(templateError.message))}
            type="button"
          >
            Descargar plantilla
          </button>
          <label className="cursor-pointer rounded-lg bg-blue-50 px-3 py-1.5 text-[0.5625rem] font-semibold text-blue-800 hover:bg-blue-100">
            Elegir archivo (.xlsx o .csv)
            <input accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="sr-only" onChange={readFile} type="file" />
          </label>
          {fileName && <span className="text-[0.5625rem] text-slate-500">{fileName}</span>}
        </div>

        <div className="min-h-[8rem] flex-1 overflow-auto">
          {error && <p className="px-4 py-4 text-[0.625rem] font-medium text-red-600" role="alert">{error}</p>}
          {!rows && !error && (
            <p className="px-4 py-8 text-center text-[0.625rem] text-slate-500">
              Elegí la planilla para ver una vista previa antes de importar.
            </p>
          )}
          {rows && (
            <table className="hr-data-table hr-data-table--standard w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr>
                  <th className="pl-4">Fila</th>
                  <th>Empleado</th>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th className="pr-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const result = resultByLine.get(row.line);
                  const problem = row.problem || (result && !result.ok ? result.error : "");
                  return (
                    <tr key={row.line}>
                      <td className="pl-4 text-slate-500">{row.line}</td>
                      <td>
                        <div className="font-semibold text-slate-800">{row.employee?.name ?? "—"}</div>
                        <div className="text-slate-500">Leg. #{row.legajo || "—"}</div>
                      </td>
                      <td className="whitespace-nowrap">{row.date ? toDisplayDate(row.date) : "—"}</td>
                      <td className="whitespace-nowrap">{row.entry || "—"}</td>
                      <td className="whitespace-nowrap">
                        {row.exit || "—"}
                        {row.overnight ? " (+1)" : ""}
                      </td>
                      <td className="pr-4">
                        {problem ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">{problem}</span>
                        ) : result?.ok ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">Importado</span>
                        ) : (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">Listo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <p className="text-[0.5625rem] text-slate-500">
            {rows
              ? `${valid.length} ${valid.length === 1 ? "fila lista" : "filas listas"}${skipped ? ` · ${skipped} con errores que no se importan` : ""}`
              : ""}
          </p>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 hover:bg-slate-50"
              disabled={importing}
              onClick={onClose}
              type="button"
            >
              {results ? "Cerrar" : "Cancelar"}
            </button>
            {!results && (
              <button
                className="rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                disabled={!valid.length || importing}
                onClick={runImport}
                type="button"
              >
                {importing ? "Importando..." : `Importar ${valid.length} ${valid.length === 1 ? "fichaje" : "fichajes"}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
