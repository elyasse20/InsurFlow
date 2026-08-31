/**
 * Export utilities for Excel (CSV) and PDF.
 *
 * Uses:
 *  - jspdf + jspdf-autotable (already installed) for PDF
 *  - Pure JS blob/CSV for Excel — no extra dependency needed
 */

import api from '@/lib/api';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number; // only used for PDF column widths
}

// ── CSV / Excel ───────────────────────────────────────────────────────────────

/**
 * Export data to a UTF-8 CSV file that Excel can open directly.
 * Adds a BOM so Excel renders Arabic/French characters correctly.
 */
export function exportToCSV(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename = 'export'
): void {
  const BOM = '\uFEFF';
  const header = columns.map(c => `"${c.header}"`).join(';');
  const body = rows
    .map(row =>
      columns.map(c => {
        const val = row[c.key] ?? '';
        // Escape quotes and wrap in quotes to handle commas/newlines
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(';')
    )
    .join('\n');

  const csvContent = BOM + header + '\n' + body;
  downloadBlob(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
}

// ── PDF ───────────────────────────────────────────────────────────────────────

/**
 * Export data to a styled PDF table using jspdf + jspdf-autotable.
 */
export async function exportToPDF(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  title: string,
  filename = 'export'
): Promise<void> {
  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235); // primary blue
  doc.text(title, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // muted
  doc.text(
    `Exporté le ${new Date().toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' })}  —  InsurFlow`,
    14,
    26
  );

  // ── Table ──────────────────────────────────────────────────────────────────
  const tableBody = rows.map(row =>
    columns.map(c => String(row[c.key] ?? ''))
  );

  autoTable(doc, {
    startY: 32,
    head: [columns.map(c => c.header)],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { cellWidth: c.width ?? 'auto' }])
    ),
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

// ── Helper ────────────────────────────────────────────────────────────────────

export function downloadBlob(content: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads an invoice PDF via Axios with Bearer token & responseType blob.
 */
export async function downloadInvoicePdf(invoiceId: string, filename?: string): Promise<void> {
  const res = await api.get(`/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
  });
  const defaultName = filename
    ? (filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
    : `facture-${invoiceId}.pdf`;
  downloadBlob(res.data, defaultName, 'application/pdf');
}
