/**
 * ExportMenu.jsx — Reusable export button/dropdown for dashboard pages.
 *
 * Usage (simple — whole-page export):
 *   const contentRef = useRef(null);
 *   <ExportMenu targetRef={contentRef} fileName="QFD-Home" title="QFD — Home" />
 *   <div ref={contentRef}> ... dashboard content ... </div>
 *
 * Usage (with per-chart/table items):
 *   <ExportMenu
 *     targetRef={contentRef}
 *     fileName="QFD-Home"
 *     title="QFD — Home"
 *     items={[
 *       { id: "payment-history", label: "Recent Months Payment History", ref: chartRef, data: chartData },
 *       { id: "total-charges",   label: "Total Charges",                 ref: chart2Ref               },
 *     ]}
 *   />
 *
 * Props:
 *   targetRef        -- React ref pointing to the DOM node to capture (whole page)
 *   fileName         -- base file name (no extension)
 *   title            -- shown in PDF header
 *   excelData        -- optional: { sheets: [{ name, rows: [[...]] }] } for whole-page Excel/CSV
 *   items            -- optional array of { id, label, ref, data? } for individual chart/table export
 *   datasourceItems  -- array of { id, label, table, endpoint } for Data Source backend export
 *                       The endpoint must start with "/<client>/..." so the client can be inferred.
 */

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download, FileImage, FileText, Table,
  FileSpreadsheet, ChevronDown, ChevronRight, Loader2, Database,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── html2canvas wrapper ────────────────────────────────────────────────────────

async function captureNode(node) {
  const mod = await import('html2canvas');
  const html2canvas = mod.default ?? mod;
  return html2canvas(node, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15000,
    ignoreElements: (el) =>
      el.hasAttribute('data-export-ignore') ||
      el.closest('[data-export-ignore]') !== null,
  });
}

// ── Title helpers — fix truncated headings before capture ──────────────────────

function unhideTitles(node) {
  const saved = [];
  node.querySelectorAll('h1,h2,h3,h4,h5').forEach((el) => {
    saved.push({
      el,
      ow: el.style.overflow,
      to: el.style.textOverflow,
      ws: el.style.whiteSpace,
    });
    el.style.overflow     = 'visible';
    el.style.textOverflow = 'clip';
    el.style.whiteSpace   = 'normal';
  });
  return saved;
}

function restoreTitles(saved) {
  saved.forEach(({ el, ow, to, ws }) => {
    el.style.overflow     = ow;
    el.style.textOverflow = to;
    el.style.whiteSpace   = ws;
  });
}

// ── Title banner — injected above individual chart captures ───────────────────

function injectBanner(node, label) {
  const el = document.createElement('div');
  el.setAttribute('data-export-banner', '');
  el.style.cssText = [
    'padding:10px 16px',
    'background:#fff1f2',
    'border-bottom:3px solid #dc2626',
    'font-family:system-ui,-apple-system,Segoe UI,sans-serif',
    'font-size:14px',
    'font-weight:700',
    'color:#0f172a',
    'white-space:normal',
    'word-break:break-word',
    'line-height:1.45',
    'letter-spacing:-0.01em',
  ].join(';');
  el.textContent = label;
  node.insertBefore(el, node.firstChild);
  return el;
}

function removeBanner(el) {
  el?.parentNode?.removeChild(el);
}

// ── PNG ────────────────────────────────────────────────────────────────────────

async function exportPNG(targetRef, fileName, label = null) {
  const node = targetRef?.current;
  if (!node) throw new Error('Nothing to capture — content ref is empty.');

  const banner = label ? injectBanner(node, label) : null;
  const saved  = unhideTitles(node);
  let canvas;
  try {
    canvas = await captureNode(node);
  } finally {
    restoreTitles(saved);
    removeBanner(banner);
  }
  const dataUrl = canvas.toDataURL('image/png');
  const link    = document.createElement('a');
  link.download = fileName + '.png';
  link.href     = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── PDF ────────────────────────────────────────────────────────────────────────

async function exportPDF(targetRef, fileName, title, label = null) {
  const node = targetRef?.current;
  if (!node) throw new Error('Nothing to capture — content ref is empty.');

  const mod   = await import('jspdf');
  const jsPDF = mod.default ?? mod.jsPDF ?? mod;

  const banner = label ? injectBanner(node, label) : null;
  const saved  = unhideTitles(node);
  let canvas;
  try {
    canvas = await captureNode(node);
  } finally {
    restoreTitles(saved);
    removeBanner(banner);
  }

  // A4 landscape: 297 × 210 mm
  const pageW   = 297;
  const pageH   = 210;
  const margin  = 10;
  const availW  = pageW - margin * 2;
  const headerH = 12;
  const availH  = pageH - margin * 2 - headerH;

  const imgW  = canvas.width;
  const imgH  = canvas.height;
  const drawW = availW;
  const drawH = drawW / (imgW / imgH);

  const pdf        = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const totalPages = Math.ceil(drawH / availH);
  const dateStr    = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);

    // Truncate title to fit next to the date string (leave ~45 mm for the date)
    const maxTitleChars = 90;
    const displayTitle  = title.length > maxTitleChars
      ? title.slice(0, maxTitleChars - 1) + '…'
      : title;
    pdf.text(displayTitle, margin, margin + 5);
    pdf.text(dateStr, pageW - margin, margin + 5, { align: 'right' });
    pdf.setDrawColor(220, 53, 53);
    pdf.setLineWidth(0.4);
    pdf.line(margin, margin + 7, pageW - margin, margin + 7);

    const sliceY = page * availH;
    const srcY   = Math.floor((sliceY / drawH) * imgH);
    const srcH   = Math.min(Math.ceil((availH / drawH) * imgH), imgH - srcY);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width  = imgW;
    sliceCanvas.height = srcH;
    sliceCanvas.getContext('2d').drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);

    pdf.addImage(
      sliceCanvas.toDataURL('image/png'),
      'PNG',
      margin,
      margin + headerH,
      drawW,
      (srcH / imgH) * drawH,
    );
  }

  pdf.save(fileName + '.pdf');
}

// -- DOM table extraction ------------------------------------------------------

function extractTablesFromDOM(node) {
  if (!node) return [];
  const tables = node.querySelectorAll('table');
  const sheets = [];
  tables.forEach((tbl, idx) => {
    const rows = [];
    tbl.querySelectorAll('tr').forEach((tr) => {
      const cells = [];
      tr.querySelectorAll('th, td').forEach((td) => {
        cells.push(td.innerText ?? td.textContent ?? '');
      });
      if (cells.length) rows.push(cells);
    });
    if (rows.length) sheets.push({ name: 'Table ' + (idx + 1), rows });
  });
  return sheets;
}

// -- Excel ---------------------------------------------------------------------

async function exportExcel(targetRef, fileName, excelData) {
  const mod  = await import('xlsx');
  const XLSX = mod.default ?? mod;

  let sheets = excelData?.sheets;
  if (!sheets?.length) sheets = extractTablesFromDOM(targetRef?.current);
  if (!sheets?.length) throw new Error('No table data found to export.');

  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, (sheet.name || 'Sheet').slice(0, 31));
  }
  XLSX.writeFile(wb, fileName + '.xlsx');
}

// -- CSV -----------------------------------------------------------------------

async function exportCSV(targetRef, fileName, excelData) {
  let sheets = excelData?.sheets;
  if (!sheets?.length) sheets = extractTablesFromDOM(targetRef?.current);
  if (!sheets?.length) throw new Error('No table data found to export.');

  const rows       = sheets[0].rows;
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '').replace(/"/g, '""');
          return /[,"\n\r]/.test(str) ? '"' + str + '"' : str;
        })
        .join(','),
    )
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = fileName + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -- Data Source export (backend-driven) ---------------------------------------

/**
 * Infer the client key from a datasource item endpoint.
 * e.g. '/qfd/datasource?chart=foo'  → 'qfd'
 *      '/usneuro/datasource?...'     → 'usneuro'
 *      '/ionm/datasource?...'        → 'ionm'
 */
function inferClient(endpoint) {
  if (!endpoint) return null;
  // Strip leading slash and take the first path segment
  return endpoint.replace(/^\//, '').split('/')[0] || null;
}

/**
 * exportDataSource — calls the backend streaming endpoint.
 *
 * The backend:
 *   1. Validates client + chart IDs against a server-side map (schema/table never sent from frontend)
 *   2. Runs SELECT * on each source table (up to 2 M rows, 5-min timeout)
 *   3. Builds an xlsx workbook using aoa_to_sheet (no "Too many properties" error)
 *   4. Streams the buffer back as Content-Type: application/vnd.openxmlformats-...
 *
 * The frontend simply downloads the blob — zero Excel processing in the browser.
 */
// EXPORT_TIMEOUT_MS: backend now fetches all tables in parallel (Promise.all).
// 100K rows per table × parallel fetch = typically 20-60 seconds. 3 min is generous.
const EXPORT_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

async function exportDataSource(dsItems, singleItem, fName) {
  if (!dsItems?.length && !singleItem) {
    throw new Error('No data source items are configured for this page.');
  }

  const targets = singleItem ? [singleItem] : dsItems;

  // Derive client from the first item's endpoint  (/qfd/datasource?... → 'qfd')
  const client = inferClient(targets[0]?.endpoint);
  if (!client) {
    throw new Error('Could not determine client from datasource endpoint. Check datasourceItems have a valid endpoint.');
  }

  // Build chart ID list for the backend
  const chartIds = targets.map((t) => t.id).join(',');

  const baseURL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
    || 'http://localhost:4000/api';
  const token   = localStorage.getItem('iq_token') || localStorage.getItem('token') || '';

  const url = baseURL + '/export/data-source/download'
    + '?client=' + encodeURIComponent(client)
    + '&charts=' + encodeURIComponent(chartIds);

  // AbortController gives us a hard timeout so the spinner never hangs forever
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method:  'GET',
      signal:  controller.signal,
      headers: { Authorization: 'Bearer ' + token },
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr.name === 'AbortError') {
      throw new Error('Export timed out after 8 minutes. Try exporting a single chart instead.');
    }
    throw new Error('Network error: ' + fetchErr.message);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    let msg = 'HTTP ' + response.status;
    try {
      const errJson = await response.json();
      msg = errJson?.message || msg;
    } catch { /* response wasn't JSON */ }
    throw new Error('Export failed: ' + msg);
  }

  // Verify backend actually returned an Excel file
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('spreadsheetml') && !contentType.includes('octet-stream')) {
    // Likely an error JSON — read it and surface the message
    let errMsg = 'Unexpected response from server (content-type: ' + contentType + ')';
    try {
      const text = await response.text();
      const parsed = JSON.parse(text);
      if (parsed?.message) errMsg = parsed.message;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  const blob     = await response.blob();
  const blobUrl  = window.URL.createObjectURL(blob);
  const dateTag  = new Date().toISOString().slice(0, 10);
  const fileName = singleItem
    ? fName + '-' + singleItem.id + '-datasource-' + dateTag + '.xlsx'
    : fName + '-datasource-' + dateTag + '.xlsx';

  // Trigger download — revokeObjectURL is deferred so the browser can start the download
  const link     = document.createElement('a');
  link.href      = blobUrl;
  link.download  = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  // Give the browser 2 s to initiate the download before releasing the object URL
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }, 2000);
}

// -- Helpers -------------------------------------------------------------------

const MENU_ITEMS = [
  { key: 'pdf',        label: 'Export PDF',               icon: FileText },
  { key: 'png',        label: 'Export Image (PNG)',        icon: FileImage },
  { key: 'excel',      label: 'Export Excel (.xlsx)',      icon: FileSpreadsheet },
  { key: 'csv',        label: 'Export CSV',                icon: Table },
  { key: 'datasource', label: 'Export Data Source (.xlsx)', icon: Database },
];

const LOADING_LABELS = {
  pdf:        'Generating PDF...',
  png:        'Capturing image...',
  excel:      'Building Excel...',
  csv:        'Building CSV...',
  datasource: 'Downloading data source...',
};

function buildSubItems(key, items) {
  const isData       = key === 'excel' || key === 'csv';
  const isDatasource = key === 'datasource';
  const wholeLabel   = isDatasource ? 'Whole Page Data Source'
    : isData ? 'Whole Page Data'
    : 'Whole Page';
  return [
    { id: '__whole__', label: wholeLabel, ref: null, data: null },
    ...(items || []).map((it) => ({
      ...it,
      label: isData ? it.label + ' Data' : it.label,
    })),
  ];
}

function normaliseItemData(item) {
  if (!item?.data) return null;
  if (Array.isArray(item.data)) {
    return { sheets: [{ name: item.label.replace(/ Data$/, ''), rows: item.data }] };
  }
  if (item.data?.sheets) return item.data;
  return null;
}

// -- Component -----------------------------------------------------------------

export default function ExportMenu({
  targetRef,
  fileName        = 'export',
  title           = 'Dashboard Export',
  excelData       = null,
  items           = null,
  datasourceItems = null,   // [{ id, label, table, endpoint }] for Data Source export
}) {
  const [open,          setOpen]          = useState(false);
  const [busy,          setBusy]          = useState(null);
  const [activeSubMenu, setActiveSubMenu] = useState(null);
  const [subMenuStyle,  setSubMenuStyle]  = useState({});
  const [autoItems,     setAutoItems]     = useState([]);

  const menuRef    = useRef(null);
  const closeTimer = useRef(null);

  // Auto-discover chart/table items from DOM when items prop is not provided
  useEffect(() => {
    if (!open || items) { setAutoItems([]); return; }
    const node = targetRef?.current;
    if (!node) { setAutoItems([]); return; }

    const els = Array.from(node.querySelectorAll('[data-export-item]')).filter((el) => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null;
    });
    if (!els.length) { setAutoItems([]); return; }

    setAutoItems(
      els.map((el, i) => {
        const label = el.getAttribute('data-export-label') || `Item ${i + 1}`;
        const id    = el.getAttribute('data-export-id')
          || label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return { id, label, ref: { current: el } };
      }),
    );
  }, [open, items, targetRef]);

  const effectiveItems = items ?? (autoItems.length > 0 ? autoItems : null);
  const hasItems       = !!(effectiveItems && effectiveItems.length > 0);

  // Close on outside click
  useEffect(() => {
    if (!open) {
      setActiveSubMenu(null);
      return;
    }
    const handler = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        e.target.closest('[data-export-submenu]')
      ) return;
      setOpen(false);
      setActiveSubMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);

  // Sub-menu hover helpers
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setActiveSubMenu(null), 130);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const hasDatasourceItems = !!(datasourceItems && datasourceItems.length > 0);

  // Items used for the sub-menu: datasource key uses datasourceItems, all others use effectiveItems
  const itemsForKey = (key) => key === 'datasource' ? datasourceItems : effectiveItems;

  const openSubMenu = (key, el) => {
    cancelClose();
    const rect   = el.getBoundingClientRect();
    const subW   = 260;
    const gap    = 4;

    const spaceRight = window.innerWidth - rect.right;
    const left = spaceRight >= subW + gap
      ? rect.right + gap
      : rect.left - subW - gap;

    const subH       = Math.min(buildSubItems(key, itemsForKey(key)).length * 38 + 8, window.innerHeight - 40);
    const topClamped = Math.min(rect.top, window.innerHeight - subH - 8);

    setSubMenuStyle({
      position : 'fixed',
      top      : topClamped,
      left,
      width    : subW,
      zIndex   : 9999,
    });
    setActiveSubMenu(key);
  };

  // Export handler
  const handleExport = async (key, item = null) => {
    setOpen(false);
    setActiveSubMenu(null);
    setBusy(key);
    const toastId = toast.loading(LOADING_LABELS[key]);
    try {
      if (key === 'datasource') {
        await exportDataSource(datasourceItems, item, fileName);
        toast.success('Download ready!', { id: toastId });
        return;
      }

      const ref        = item?.ref ?? targetRef;
      const data       = item ? normaliseItemData(item) : excelData;
      const fName      = fileName + (item?.id ? '-' + item.id : '');
      const cleanLabel = item?.label ? item.label.replace(/ Data$/, '') : null;
      const pdfTitle   = title + (cleanLabel ? ' — ' + cleanLabel : '');

      if (key === 'pdf')   await exportPDF(ref, fName, pdfTitle, cleanLabel);
      if (key === 'png')   await exportPNG(ref, fName, cleanLabel);
      if (key === 'excel') await exportExcel(ref, fName, data);
      if (key === 'csv')   await exportCSV(ref, fName, data);
      toast.success('Download ready!', { id: toastId });
    } catch (err) {
      console.error('[ExportMenu]', err);
      toast.error(err?.message || 'Export failed. Please try again.', { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  const handleMenuItemClick = (key, e) => {
    if (key === 'datasource') {
      if (hasDatasourceItems) { openSubMenu(key, e.currentTarget); return; }
      handleExport(key); // no items — trigger directly and let exportDataSource throw a clear error
      return;
    }
    if (!hasItems) { handleExport(key); return; }
    openSubMenu(key, e.currentTarget);
  };

  // Sub-menu rendered via portal to escape overflow-hidden ancestors.
  const showPortal = activeSubMenu && (
    (activeSubMenu === 'datasource' && hasDatasourceItems) ||
    (activeSubMenu !== 'datasource' && hasItems)
  );

  const subMenuPortal = showPortal
    ? createPortal(
        <div
          data-export-submenu="true"
          style={subMenuStyle}
          className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden py-1"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {buildSubItems(activeSubMenu, itemsForKey(activeSubMenu)).map((subItem) => (
            <button
              key={subItem.id}
              onClick={() =>
                handleExport(activeSubMenu, subItem.id === '__whole__' ? null : subItem)
              }
              disabled={!!busy}
              className={[
                'w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs transition-colors disabled:opacity-50',
                'hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400',
                subItem.id === '__whole__'
                  ? 'font-semibold text-slate-800 dark:text-zinc-100 border-b border-slate-100 dark:border-zinc-800 mb-1'
                  : 'font-medium text-slate-700 dark:text-zinc-200',
              ].join(' ')}
            >
              {subItem.id === '__whole__' && (
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex-shrink-0">
                  <svg viewBox="0 0 10 10" width="8" height="8" fill="currentColor">
                    <rect x="0" y="0" width="4" height="4" rx="0.5" />
                    <rect x="5" y="0" width="4" height="4" rx="0.5" />
                    <rect x="0" y="5" width="4" height="4" rx="0.5" />
                    <rect x="5" y="5" width="4" height="4" rx="0.5" />
                  </svg>
                </span>
              )}
              {subItem.label}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {/* Wrapper: inline-flex so it sits naturally in flex header rows */}
      <div ref={menuRef} className="relative inline-flex items-center" data-export-ignore>
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={!!busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition-colors disabled:opacity-60 shadow-sm"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {busy ? 'Exporting...' : 'Export'}
          {!busy && (
            <ChevronDown size={11} className={'transition-transform ' + (open ? 'rotate-180' : '')} />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
            {MENU_ITEMS.map(({ key, label, icon: Icon }) => {
              const canExpand = key === 'datasource' ? hasDatasourceItems : hasItems;
              return (
                <button
                  key={key}
                  onClick={(e) => handleMenuItemClick(key, e)}
                  onMouseEnter={(e) => canExpand && openSubMenu(key, e.currentTarget)}
                  onMouseLeave={canExpand ? scheduleClose : undefined}
                  disabled={!!busy}
                  className={[
                    'w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors disabled:opacity-50',
                    activeSubMenu === key
                      ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                      : 'text-slate-700 dark:text-zinc-200 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={13} className="flex-shrink-0 text-slate-400" />
                    {label}
                  </span>
                  {canExpand && (
                    <ChevronRight size={11} className="flex-shrink-0 opacity-50" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {subMenuPortal}
    </>
  );
}
