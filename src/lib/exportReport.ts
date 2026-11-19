// Exportar el reporte filtrado de Estadisticas a Excel (.xlsx) y PDF.
// Las librerias se cargan solo cuando el usuario pide el archivo.
import type { StatsRecord, ZoneStats } from "../api/types";

export type ReportInfo = {
  /** ej. "Accidente de tránsito en Torobajo, noviembre 2026" */
  title: string;
  /** nombre del archivo sin extension */
  fileName: string;
};

const COLUMNS: { key: keyof StatsRecord; label: string; width: number }[] = [
  { key: "date", label: "Fecha", width: 12 },
  { key: "time", label: "Hora", width: 8 },
  { key: "type", label: "Tipo de alerta", width: 26 },
  { key: "category", label: "Categoría", width: 18 },
  { key: "title", label: "Título", width: 40 },
  { key: "neighborhood", label: "Barrio", width: 24 },
  { key: "comuna", label: "Comuna", width: 9 },
  { key: "address", label: "Dirección", width: 30 },
  { key: "status", label: "Estado", width: 11 },
];

/** "Accidentes en Torobajo" -> "accidentes-en-torobajo" */
export function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function download(data: Blob, name: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const generatedAt = () =>
  new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });

/* ---------------------------- Excel (.xlsx) ---------------------------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = (i: number) => String.fromCharCode(65 + i);

function cell(ref: string, value: string | number | null | undefined, style = 0) {
  const s = style ? ` s="${style}"` : "";
  if (typeof value === "number") return `<c r="${ref}"${s}><v>${value}</v></c>`;
  if (value === null || value === undefined || value === "") return `<c r="${ref}"${s}/>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(value))}</t></is></c>`;
}

export async function exportExcel(stats: ZoneStats, info: ReportInfo) {
  const { zipSync, strToU8 } = await import("fflate");
  const records = stats.records ?? [];
  const rows: string[] = [];
  let r = 1;
  const row = (cells: string[], extra = "") => rows.push(`<row r="${r}"${extra}>${cells.join("")}</row>`);

  row([cell(`A${r}`, `AlertaBarrio · ${info.title}`, 2)], ' ht="24" customHeight="1"');
  r++;
  row([cell(`A${r}`, `Total: ${stats.total} incidentes · Generado el ${generatedAt()}`, 3)]);
  r += 2;
  row(COLUMNS.map((c, i) => cell(`${colName(i)}${r}`, c.label, 1)));
  const headerRow = r;
  for (const rec of records) {
    r++;
    row(COLUMNS.map((c, i) => cell(`${colName(i)}${r}`, rec[c.key] as string | number | null)));
  }

  // resumen por tipo y por barrio debajo de la tabla
  r += 2;
  row([cell(`A${r}`, "Resumen por tipo", 1), cell(`B${r}`, "", 1), cell(`C${r}`, "Cantidad", 1)]);
  for (const t of stats.by_type) {
    r++;
    row([cell(`A${r}`, t.name), cell(`C${r}`, t.count)]);
  }
  r += 2;
  row([cell(`A${r}`, "Barrios con más incidentes", 1), cell(`B${r}`, "", 1), cell(`C${r}`, "Cantidad", 1)]);
  for (const h of stats.top_neighborhoods) {
    r++;
    row([cell(`A${r}`, h.name), cell(`C${r}`, h.count)]);
  }

  const last = colName(COLUMNS.length - 1);
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${COLUMNS.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows.join("")}</sheetData>
${records.length ? `<autoFilter ref="A${headerRow}:${last}${headerRow + records.length}"/>` : ""}
<mergeCells count="2"><mergeCell ref="A1:${last}1"/><mergeCell ref="A2:${last}2"/></mergeCells>
</worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF9F1239"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFBE123C"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const files = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reporte" sheetId="1" r:id="rId1"/></sheets>${records.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Reporte!$A$${headerRow}:$${last}$${headerRow + records.length}</definedName></definedNames>` : ""}</workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
    "xl/styles.xml": strToU8(styles),
  };
  const zip = zipSync(files);
  download(
    new Blob([zip as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${info.fileName}.xlsx`,
  );
}

/* --------------------------------- PDF --------------------------------- */

export async function exportPdf(stats: ZoneStats, info: ReportInfo) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const records = stats.records ?? [];

  // encabezado rojo
  doc.setFillColor(159, 18, 57);
  doc.rect(0, 0, W, 64, "F");
  doc.setFillColor(225, 29, 72);
  doc.rect(0, 64, W, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AlertaBarrio", 36, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Reporte de incidentes · Pasto, Nariño", 36, 50);
  doc.text(`Generado el ${generatedAt()}`, W - 36, 50, { align: "right" });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(info.title, 36, 98);

  // tarjetas de resumen
  const top = stats.top_neighborhoods[0];
  const topType = stats.by_type[0];
  const cards = [
    { label: "Total de incidentes", value: String(stats.total) },
    { label: "Activos en el mapa", value: String(stats.active_now) },
    { label: "Barrio con más casos", value: top ? `${top.name} (${top.count})` : "—" },
    { label: "Tipo más frecuente", value: topType ? `${topType.name} (${topType.count})` : "—" },
  ];
  const cw = (W - 72 - 3 * 12) / 4;
  cards.forEach((c, i) => {
    const x = 36 + i * (cw + 12);
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(x, 112, cw, 50, 6, 6, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(136, 19, 55);
    doc.text(c.label.toUpperCase(), x + 10, 128);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(c.value, cw - 20)[0], x + 10, 149);
  });

  autoTable(doc, {
    startY: 178,
    head: [COLUMNS.filter((c) => c.key !== "category").map((c) => c.label)],
    body: records.map((r) =>
      COLUMNS.filter((c) => c.key !== "category").map((c) => (r[c.key] === null || r[c.key] === undefined ? "" : String(r[c.key]))),
    ),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [190, 18, 60], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [255, 247, 248] },
    columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 36 }, 5: { cellWidth: 44, halign: "center" }, 7: { cellWidth: 52 } },
    margin: { left: 36, right: 36, bottom: 36 },
    didDrawPage: () => {
      const H = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("AlertaBarrio · Estructuras de Datos", 36, H - 18);
      doc.text(`Página ${doc.getNumberOfPages()}`, W - 36, H - 18, { align: "right" });
    },
  });
  if (!records.length) {
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("No hay incidentes para este filtro.", 36, 210);
  }
  doc.save(`${info.fileName}.pdf`);
}
