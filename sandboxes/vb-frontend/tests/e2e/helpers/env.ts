import { getLiveSeed } from './liveSeed';

export interface E2EEnv {
  tdEmail: string;
  tdPassword: string;
  eventId: string;
  mixedEventId: string;
  /** Optional event id whose scoring round is double elimination (visual E2E). */
  deEventId: string;
}

export interface CrudE2EEnv {
  tdEmail: string;
  tdPassword: string;
  apiUrl: string;
}

function liveSeedOrNull() {
  try {
    return getLiveSeed();
  } catch {
    return null;
  }
}

export function getE2EEnv(): E2EEnv | null {
  const seed = liveSeedOrNull();
  const tdEmail = process.env.PW_E2E_TD_EMAIL || seed?.tdEmail || '';
  const tdPassword = process.env.PW_E2E_TD_PASSWORD || seed?.tdPassword || '';
  const eventId = process.env.PW_E2E_EVENT_ID || (seed?.eventId != null ? String(seed.eventId) : '');
  const mixedEventId =
    process.env.PW_E2E_MIXED_EVENT_ID ||
    (seed?.mixedEventId != null ? String(seed.mixedEventId) : eventId);
  const deEventId =
    process.env.PW_E2E_DE_EVENT_ID || (seed?.deEventId != null ? String(seed.deEventId) : '');

  if (!tdEmail || !tdPassword || !eventId) {
    return null;
  }

  return { tdEmail, tdPassword, eventId, mixedEventId, deEventId };
}

/** Seeded backend required; set PW_E2E_API_URL to the running API origin (e.g. http://127.0.0.1:8000). */
export function getCrudE2EEnv(): CrudE2EEnv | null {
  const seed = liveSeedOrNull();
  const tdEmail = process.env.PW_E2E_TD_EMAIL || seed?.tdEmail || '';
  const tdPassword = process.env.PW_E2E_TD_PASSWORD || seed?.tdPassword || 'password123';
  const apiUrl = process.env.PW_E2E_API_URL || process.env.VITE_API_URL || '';

  if (!tdEmail || !tdPassword || !apiUrl) {
    return null;
  }

  return { tdEmail, tdPassword, apiUrl };
}
