/**
 * Relative / absolute date helpers for packed guide utterances.
 * Tournament form ignores dates; we still keep a reference range for event math.
 */

export type DateRangeYmd = { startYmd: string; endYmd: string };

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/** Next upcoming calendar occurrence of month/day from `from` (local). */
export function nextOccurrenceOfMonthDay(
  monthIndex: number,
  day: number,
  from: Date = new Date()
): Date {
  const y = from.getFullYear();
  let candidate = new Date(y, monthIndex, day, 0, 0, 0, 0);
  const startOfToday = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (candidate < startOfToday) {
    candidate = new Date(y + 1, monthIndex, day, 0, 0, 0, 0);
  }
  return candidate;
}

/**
 * Parse ranges like "Sep 25th to Sep 30th", "September 25 - 30", "from Sep 25 to Sep 30".
 * Year omitted → next upcoming start date.
 */
export function parseMonthDayRange(
  text: string,
  from: Date = new Date()
): DateRangeYmd | null {
  const t = text.replace(/(\d+)(st|nd|rd|th)/gi, '$1');

  const full = t.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\s*(?:to|-|through|thru|until)\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(\d{1,2})\b/i
  );
  if (!full) return null;

  const m1 = MONTHS[full[1].toLowerCase()];
  const d1 = Number(full[2]);
  const m2 = full[3] ? MONTHS[full[3].toLowerCase()] : m1;
  const d2 = Number(full[4]);
  if (m1 == null || m2 == null || !d1 || !d2) return null;

  const start = nextOccurrenceOfMonthDay(m1, d1, from);
  let end = new Date(start.getFullYear(), m2, d2);
  if (end < start) {
    end = new Date(start.getFullYear() + (m2 < m1 ? 1 : 0), m2, d2);
    if (end < start) end = new Date(start.getFullYear() + 1, m2, d2);
  }
  return { startYmd: toYmd(start), endYmd: toYmd(end) };
}

/** First N calendar days of a reference range (inclusive). */
export function firstNDaysOfRange(range: DateRangeYmd, n: number): DateRangeYmd | null {
  if (n < 1) return null;
  const [ys, ms, ds] = range.startYmd.split('-').map(Number);
  const start = new Date(ys, ms - 1, ds);
  const end = new Date(ys, ms - 1, ds + (n - 1));
  return { startYmd: toYmd(start), endYmd: toYmd(end) };
}

export function parseFirstNDaysPhrase(text: string): number | null {
  const m = text.match(/\bfirst\s+(\d+)\s+days?\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse "9 am" / "2-4 pm" / "8 pm" → { hour24, minute }. */
export function parseClockToken(token: string): { hour24: number; minute: number } | null {
  const m = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && hour < 12) hour += 12;
  if (ap === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour24: hour, minute };
}

export function combineYmdAndClock(ymd: string, clock: { hour24: number; minute: number }): string {
  const [y, m, d] = ymd.split('-');
  return `${y}-${m}-${d}T${pad2(clock.hour24)}:${pad2(clock.minute)}:00`;
}

/**
 * "from 9 am on the first day to 8 pm on 2nd day" against an event day range.
 */
export function parseDayRelativeDateTimes(
  text: string,
  eventRange: DateRangeYmd
): { start_date?: string; end_date?: string } {
  const out: { start_date?: string; end_date?: string } = {};
  const startM = text.match(
    /\bfrom\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+on\s+the\s+first\s+day\b/i
  );
  const endM = text.match(
    /\bto\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+on\s+(?:the\s+)?(?:2nd|second|\d+)\s+day\b/i
  );
  if (startM) {
    const c = parseClockToken(startM[1]);
    if (c) out.start_date = combineYmdAndClock(eventRange.startYmd, c);
  }
  if (endM) {
    const c = parseClockToken(endM[1]);
    if (c) out.end_date = combineYmdAndClock(eventRange.endYmd, c);
  }
  // Fallback: bare "from 9 am to 8 pm" on single/multi day range
  if (!out.start_date || !out.end_date) {
    const span = text.match(
      /\bfrom\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i
    );
    if (span) {
      const a = parseClockToken(span[1]);
      const b = parseClockToken(span[2]);
      if (a && !out.start_date) out.start_date = combineYmdAndClock(eventRange.startYmd, a);
      if (b && !out.end_date) out.end_date = combineYmdAndClock(eventRange.endYmd, b);
    }
  }
  return out;
}

/** "3 squads on the first day, between 2-4 pm" → notes + structured hint. */
export function parseSquadDayWindow(text: string): {
  squad_count?: number;
  squad_day?: number;
  squad_window_start?: string;
  squad_window_end?: string;
  notes?: string;
} | null {
  const countM = text.match(/\b(\d+)\s+squads?\b/i);
  if (!countM) return null;
  const squad_count = Number(countM[1]);
  const dayM = text.match(/\bon\s+the\s+first\s+day\b/i);
  const win = text.match(/\bbetween\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to|and)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
  const out: {
    squad_count?: number;
    squad_day?: number;
    squad_window_start?: string;
    squad_window_end?: string;
    notes?: string;
  } = { squad_count };
  if (dayM) out.squad_day = 1;
  if (win) {
    out.squad_window_start = win[1].trim();
    out.squad_window_end = win[2].trim();
  }
  out.notes = `${squad_count} squads${out.squad_day === 1 ? ' on day 1' : ''}${
    out.squad_window_start ? ` ${out.squad_window_start}-${out.squad_window_end}` : ''
  }`.trim();
  return out;
}
