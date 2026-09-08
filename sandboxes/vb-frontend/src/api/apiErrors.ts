/**
 * Centralized parsing of API failures into user-facing strings.
 *
 * Backend contract (see backend/core/api_errors.py, main.py handlers):
 * - JSON body may include `error`, `error_code`, `details` (validation array or object), `status_code`, `timestamp`.
 * - HTTP 422 responses use `details: exc.errors()` (FastAPI/Pydantic shape: `{ loc, msg, type }[]`).
 * - Legacy: `detail` string or list, optional `message`.
 *
 * UI rule: use `getApiErrorMessage` / `getErrorMessage` for server-related failures instead of
 * reading `error.message` (often the generic Axios status line) or re-parsing `response.data` ad hoc.
 */

import axios, { type AxiosError } from 'axios';

type ApiErrorBody = {
  error?: string;
  detail?: unknown;
  details?: unknown;
  message?: string;
};

const SKIP_LOC = new Set(['body', 'query', 'path', 'header']);

/** Map common API field segments to short labels for validation lines. */
const FIELD_LABELS: Record<string, string> = {
  roster_signup: 'Signup',
  entry_fee: 'Entry fee',
  reentry_fee: 'Reentry fee',
  max_entries: 'Max entries',
  max_reentries: 'Max reentries',
  house_cut_type: 'House cut type',
  house_cut_percentage: 'House cut percentage',
  house_cut_amount: 'House cut amount',
  additional_prize_pool: 'Additional prize pool',
  prize_distribution: 'Prize distribution',
  prize_type: 'Prize type',
  custom_payout_structure: 'Custom payout structure',
  custom_payout_count: 'Custom payout count',
  start_date: 'Start date',
  end_date: 'End date',
  name: 'Name',
  description: 'Description',
  rules: 'Rules',
  event_format: 'Event format',
  team_size: 'Team size',
  handicap_base_score: 'Handicap base score',
  handicap_percentage: 'Handicap percentage',
  team_handicap_method: 'Team handicap method',
  team_handicap_percentage: 'Team handicap percentage',
  team_handicap_base: 'Team handicap base',
  team_scoring_method: 'Team scoring method',
  dylg_enabled: 'DYLG',
  dylg_scope: 'DYLG scope',
  dylg_drop_count: 'DYLG drop count',
  allows_reentry: 'Re-entry',
  duplicate_cashing_policy: 'Duplicate cashing policy',
};

const GENERIC_AXIOS_STATUS = /^Request failed with status code \d{3}$/i;

function humanizeFieldSegment(seg: string): string {
  return FIELD_LABELS[seg] ?? seg.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValidationLoc(loc: unknown): string {
  if (!Array.isArray(loc) || loc.length === 0) return '';
  const parts = loc.filter((seg) => seg != null && !SKIP_LOC.has(String(seg)));
  if (parts.length === 0) return '';
  const last = parts[parts.length - 1];
  const key = typeof last === 'string' ? last : String(last);
  const label = humanizeFieldSegment(key);
  if (parts.length === 1) return label;
  const prefix = parts
    .slice(0, -1)
    .map((seg) => (typeof seg === 'number' ? `[${seg}]` : String(seg)))
    .join('.');
  return prefix ? `${prefix} · ${label}` : label;
}

/**
 * FastAPI/Pydantic validation arrays (`detail` / `details`) and plain string lists.
 */
function messageFromValidationArray(arr: unknown): string | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const lines: string[] = [];
  for (const item of arr) {
    if (typeof item === 'string' && item.trim()) {
      lines.push(item.trim());
      continue;
    }
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;
    const rawMsg =
      typeof rec.msg === 'string'
        ? rec.msg
        : typeof rec.message === 'string'
          ? rec.message
          : '';
    const msg = typeof rawMsg === 'string' ? rawMsg.trim() : '';
    if (!msg) continue;
    const label = formatValidationLoc(rec.loc);
    lines.push(label ? `${label}: ${msg}` : msg);
  }
  return lines.length ? lines.join('; ') : null;
}

function messageFromDetailsObject(details: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(details)) {
    const label = humanizeFieldSegment(k);
    if (typeof v === 'string' && v.trim()) parts.push(`${label}: ${v.trim()}`);
    else if (v != null && typeof v !== 'object') parts.push(`${label}: ${String(v)}`);
  }
  return parts.length ? parts.join('; ') : null;
}

function isGenericValidationBanner(s: string): boolean {
  return s.trim().toLowerCase() === 'request validation failed';
}

/** Middleware 500 envelopes put only request routing in `details` — not user-facing field errors. */
function isRequestMetaDetails(details: Record<string, unknown>): boolean {
  const keys = Object.keys(details);
  if (keys.length === 0) return false;
  return keys.every((k) => k === 'path' || k === 'method');
}

function messageFromResponseBody(data: ApiErrorBody): string | null {
  const fromDetailsArr = messageFromValidationArray(data.details);
  if (fromDetailsArr) return fromDetailsArr;

  if (typeof data.details === 'object' && data.details !== null && !Array.isArray(data.details)) {
    const detailsObj = data.details as Record<string, unknown>;
    // DEBUG middleware may attach the real exception string — prefer it over the generic banner.
    if (typeof detailsObj.exception === 'string' && detailsObj.exception.trim()) {
      return detailsObj.exception.trim();
    }
    if (!isRequestMetaDetails(detailsObj)) {
      const fromObj = messageFromDetailsObject(detailsObj);
      if (fromObj) return fromObj;
    }
  }

  const fromDetailArr = messageFromValidationArray(data.detail);
  if (fromDetailArr) return fromDetailArr;

  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail.trim();

  if (typeof data.error === 'string' && data.error.trim()) {
    const errStr = data.error.trim();
    if (!isGenericValidationBanner(errStr) || !data.details) return errStr;
  }

  if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();

  return null;
}

function messageForHttpStatus(status: number | undefined): string | null {
  if (status == null) return null;
  switch (status) {
    case 401:
      return 'You need to sign in again to continue.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'That item was not found.';
    case 409:
      return 'That action could not be completed because it conflicts with existing data.';
    case 422:
      return 'Some of the information you entered is invalid. Check the highlighted fields and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'Something went wrong on our side. Please try again in a moment.';
    default:
      return null;
  }
}

function isUnhelpfulClientMessage(msg: string | undefined): boolean {
  if (!msg || !msg.trim()) return true;
  if (GENERIC_AXIOS_STATUS.test(msg.trim())) return true;
  return false;
}

/**
 * Readable message from axios error responses.
 * Supports unified backend envelope (`error`, optional `details`) and legacy FastAPI `detail`.
 * Prefers structured validation messages over generic banner text.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    return fallback;
  }

  const ax = err as AxiosError<ApiErrorBody>;
  const status = ax.response?.status;
  const data = ax.response?.data;

  if (data && typeof data === 'object') {
    const parsed = messageFromResponseBody(data as ApiErrorBody);
    if (parsed) return parsed;
  }

  const fromStatus = messageForHttpStatus(status);
  if (fromStatus) return fromStatus;

  const msg = ax.message;
  if (!isUnhelpfulClientMessage(msg)) return msg!;

  return fallback;
}

/**
 * Same as `getApiErrorMessage` for Axios errors; unwraps common React Query / nested `cause`
 * shapes so callers can pass `unknown` from `catch` or `onError`.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return getApiErrorMessage(err, fallback);
  }

  const withCause = err as { cause?: unknown };
  if (withCause?.cause != null && axios.isAxiosError(withCause.cause)) {
    return getApiErrorMessage(withCause.cause, fallback);
  }

  if (err instanceof Error && err.message && !GENERIC_AXIOS_STATUS.test(err.message)) {
    return err.message;
  }

  return fallback;
}
