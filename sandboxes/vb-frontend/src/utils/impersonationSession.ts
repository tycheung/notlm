import { AuthAPI } from '../api/auth';
import { impersonateTournamentDirector } from '../api/impersonation';

const INFO_KEY = 'vb_impersonation';
const BACKUP_KEY = 'vb_admin_backup';

export type ImpersonationInfo = {
  targetId: number;
  targetName: string;
  impersonatorName: string;
};

type AdminBackup = {
  token: string;
  user: string;
  expires: string | null;
};

function displayName(user: { first_name?: string; last_name?: string; email?: string | null }): string {
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.email || 'user';
}

export function getImpersonation(): ImpersonationInfo | null {
  try {
    const raw = sessionStorage.getItem(INFO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonationInfo;
  } catch {
    return null;
  }
}

export function isImpersonating(): boolean {
  return getImpersonation() !== null;
}

export async function startImpersonation(userId: number): Promise<void> {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) {
    throw new Error('Not signed in as admin');
  }
  const backup: AdminBackup = {
    token,
    user,
    expires: localStorage.getItem('token_expires_at'),
  };
  sessionStorage.setItem(BACKUP_KEY, JSON.stringify(backup));

  const result = await impersonateTournamentDirector(userId);
  const impersonatorName = displayName(result.impersonator);
  sessionStorage.setItem(
    INFO_KEY,
    JSON.stringify({
      targetId: result.user.id,
      targetName: displayName(result.user),
      impersonatorName,
    } satisfies ImpersonationInfo)
  );
  AuthAPI.storeTokens(result.access_token, undefined, result.expires_in);
  localStorage.setItem('user', JSON.stringify(result.user));
  window.location.assign('/director');
}

export function stopImpersonation(): void {
  let backup: AdminBackup | null = null;
  try {
    const raw = sessionStorage.getItem(BACKUP_KEY);
    backup = raw ? (JSON.parse(raw) as AdminBackup) : null;
  } catch {
    backup = null;
  }
  sessionStorage.removeItem(INFO_KEY);
  sessionStorage.removeItem(BACKUP_KEY);
  if (backup?.token && backup.user) {
    localStorage.setItem('token', backup.token);
    localStorage.setItem('user', backup.user);
    if (backup.expires) {
      localStorage.setItem('token_expires_at', backup.expires);
    } else {
      localStorage.removeItem('token_expires_at');
    }
  }
  window.location.assign('/admin');
}

export async function reissueImpersonationAfterAdminRefresh(): Promise<string | null> {
  const info = getImpersonation();
  if (!info) return null;
  const result = await impersonateTournamentDirector(info.targetId);
  AuthAPI.storeTokens(result.access_token, undefined, result.expires_in);
  localStorage.setItem('user', JSON.stringify(result.user));
  return result.access_token;
}
