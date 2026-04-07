/**
 * sharedStyles.js
 * ---------------
 * Centralised Tailwind class strings and inline-style constants
 * for the Review Desk frontend.
 *
 * Usage (Tailwind strings):
 *   import { btn, tbl, card, reviewPanel } from '../styles/sharedStyles';
 *   <button className={btn.primary}>Save</button>
 *
 * Usage (inline objects — only for components that still need them):
 *   import { inline } from '../styles/sharedStyles';
 *   <th style={inline.th}>...</th>
 */

/* ── Button Tailwind class strings ──────────────────────────── */
export const btn = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed',
  success:
    'bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed',
  warning:
    'bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed',
  neutral:
    'bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50',
  /** Small circle icon button */
  iconSm:
    'btn-circle btn-sm',
};

/* ── Table Tailwind class strings ───────────────────────────── */
export const tbl = {
  wrapper: 'w-full overflow-x-auto',
  table:   'min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm',
  thead:   'bg-gray-100',
  th:      'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide',
  thCenter:'px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide',
  tr:      'border-b border-gray-100 hover:bg-gray-50 transition',
  td:      'px-4 py-3 text-sm text-gray-700',
  tdCenter:'px-4 py-3 text-sm text-gray-700 text-center',
};

/* ── Card / page container ──────────────────────────────────── */
export const card = {
  page:    'flex flex-col items-center justify-start min-h-screen p-6 bg-gray-100',
  box:     'w-full max-w-6xl bg-white rounded-xl shadow-md p-6',
  boxLg:   'w-full max-w-7xl bg-white rounded-xl shadow-md p-6',
  section: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6',
};

/* ── Review / marks panel ───────────────────────────────────── */
export const reviewPanel = {
  container: 'mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm',
  header:    'flex items-center justify-between mb-4',
  title:     'text-blue-900 font-semibold text-lg',
  subtext:   'text-blue-500 text-sm font-mono',
  thStyle: {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#1e40af',       /* blue-800 */
    background: '#dbeafe',  /* blue-100 */
    borderBottom: '1px solid #bfdbfe', /* blue-200 */
  },
  tdStyle: {
    padding: '9px 14px',
    fontSize: '0.875rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
  },
  inputStyle: {
    width: '70px',
    padding: '5px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    textAlign: 'center',
  },
  totalsRow: {
    background: '#f0fdf4', /* green-50 */
    fontWeight: '600',
  },
};

/* ── Program card (course selector) ────────────────────────── */
export const programCard =
  'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md transition hover:scale-105 cursor-pointer';

/* ── Inline style objects (legacy — for fully inline components) */
export const inline = {
  /** Marks / review table header cell */
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#1e40af',
    background: '#dbeafe',
    borderBottom: '1px solid #bfdbfe',
  },
  /** Marks / review table body cell */
  td: {
    padding: '9px 14px',
    fontSize: '0.875rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
  },
  /** Number input inside marks table */
  input: {
    width: '70px',
    padding: '5px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    textAlign: 'center',
  },
};
