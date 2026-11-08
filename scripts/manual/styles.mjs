/**
 * Styling dan Utilitas HTML untuk Dokumen Microsoft Word (.doc)
 * Madrasah Diniyyah Al Amiriyyah (MADINA) Blokagung
 */

export const documentStyles = `
<style>
  @page {
    size: A4 portrait;
    margin: 2.54cm 2.54cm 2.54cm 2.54cm;
    mso-page-orientation: portrait;
    mso-header-margin: 1.25cm;
    mso-footer-margin: 1.25cm;
    mso-header: h1;
    mso-footer: f1;
  }
  @page CoverPage {
    margin: 2cm 2cm 2cm 2cm;
    mso-header: none;
    mso-footer: none;
  }
  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #1e293b;
    background-color: #ffffff;
  }
  .cover-section {
    page: CoverPage;
    page-break-after: always;
  }
  .page-break {
    page-break-before: always;
    mso-break-type: section-break;
  }
  h1 {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 20pt;
    font-weight: bold;
    color: #064e3b;
    border-bottom: 2.5pt solid #059669;
    padding-bottom: 6pt;
    margin-top: 18pt;
    margin-bottom: 12pt;
    page-break-after: avoid;
  }
  h2 {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 14pt;
    font-weight: bold;
    color: #0f766e;
    margin-top: 14pt;
    margin-bottom: 8pt;
    border-bottom: 1pt solid #cbd5e1;
    padding-bottom: 3pt;
    page-break-after: avoid;
  }
  h3 {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 12pt;
    font-weight: bold;
    color: #1e293b;
    margin-top: 10pt;
    margin-bottom: 4pt;
    page-break-after: avoid;
  }
  h4 {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    font-weight: bold;
    color: #334155;
    margin-top: 8pt;
    margin-bottom: 3pt;
    page-break-after: avoid;
  }
  p {
    margin-top: 0;
    margin-bottom: 6pt;
    text-align: justify;
  }
  ul, ol {
    margin-top: 2pt;
    margin-bottom: 6pt;
    padding-left: 22pt;
  }
  li {
    margin-bottom: 3pt;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6pt;
    margin-bottom: 10pt;
    font-size: 9.5pt;
  }
  table.data-table th {
    background-color: #064e3b;
    color: #ffffff;
    font-weight: bold;
    text-align: left;
    padding: 6pt 8pt;
    border: 1pt solid #04382a;
  }
  table.data-table td {
    padding: 5pt 8pt;
    border: 1pt solid #cbd5e1;
    vertical-align: top;
  }
  table.data-table tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  .callout-box {
    margin: 8pt 0;
    padding: 8pt 12pt;
    border-radius: 4pt;
    font-size: 10pt;
  }
  .callout-tip {
    background-color: #f0fdf4;
    border-left: 4pt solid #16a34a;
    color: #14532d;
  }
  .callout-important {
    background-color: #eff6ff;
    border-left: 4pt solid #2563eb;
    color: #1e3a8a;
  }
  .callout-warning {
    background-color: #fffbeb;
    border-left: 4pt solid #d97706;
    color: #78350f;
  }
  .badge {
    display: inline-block;
    padding: 2pt 6pt;
    font-size: 8.5pt;
    font-weight: bold;
    border-radius: 3pt;
  }
  .badge-emerald { background-color: #d1fae5; color: #065f46; border: 1pt solid #a7f3d0; }
  .badge-blue { background-color: #dbeafe; color: #1e40af; border: 1pt solid #bfdbfe; }
  .badge-amber { background-color: #fef3c7; color: #92400e; border: 1pt solid #fde68a; }
  .badge-rose { background-color: #ffe4e6; color: #9f1239; border: 1pt solid #fecdd3; }
  .badge-slate { background-color: #f1f5f9; color: #475569; border: 1pt solid #cbd5e1; }
  
  kbd {
    background-color: #f1f5f9;
    border: 1pt solid #cbd5e1;
    border-radius: 3pt;
    padding: 1pt 4pt;
    font-family: Consolas, monospace;
    font-size: 9pt;
    color: #0f172a;
  }
  code {
    font-family: Consolas, 'Courier New', monospace;
    background-color: #f8fafc;
    border: 0.5pt solid #e2e8f0;
    padding: 1pt 3pt;
    font-size: 9.5pt;
    color: #0f766e;
  }
  .cover-title {
    font-size: 26pt;
    font-weight: bold;
    color: #064e3b;
    text-align: center;
    line-height: 1.2;
    margin-top: 40pt;
  }
  .cover-subtitle {
    font-size: 13pt;
    color: #047857;
    text-align: center;
    margin-top: 15pt;
    margin-bottom: 40pt;
    line-height: 1.4;
  }
  .cover-meta-table {
    width: 80%;
    margin: 40pt auto;
    border-collapse: collapse;
    font-size: 11pt;
  }
  .cover-meta-table td {
    padding: 6pt 10pt;
    border-bottom: 1pt solid #e2e8f0;
  }
  .toc-item {
    margin-bottom: 4pt;
  }
  .toc-title {
    font-weight: bold;
    color: #064e3b;
  }
  .toc-sub {
    padding-left: 18pt;
    color: #334155;
  }
</style>
`;

export function renderCallout(type, title, content) {
  let cls = 'callout-important';
  let icon = 'ℹ️';
  if (type === 'tip') { cls = 'callout-tip'; icon = '💡'; }
  if (type === 'warning') { cls = 'callout-warning'; icon = '⚠️'; }
  if (type === 'important') { cls = 'callout-important'; icon = '📌'; }
  return `
    <div class="callout-box ${cls}">
      <strong>${icon} ${title}</strong><br/>
      ${content}
    </div>
  `;
}

export function renderBadge(text, color = 'emerald') {
  return `<span class="badge badge-${color}">${text}</span>`;
}
