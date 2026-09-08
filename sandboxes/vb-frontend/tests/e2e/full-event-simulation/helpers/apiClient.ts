import type { SimEnv } from './simEnv';

export class ApiClient {
  readonly baseUrl: string;
  private token = '';
  private tdEmail = '';
  private tdPassword = '';

  constructor(env: SimEnv) {
    this.baseUrl = env.apiUrl.replace(/\/$/, '');
  }

  async login(email: string, password: string): Promise<void> {
    this.tdEmail = email;
    this.tdPassword = password;
    const res = await fetch(`${this.baseUrl}/api/v1/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error(`Login failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as { access_token?: string };
    if (!body.access_token) {
      throw new Error('Login response missing access_token (2FA?)');
    }
    this.token = body.access_token;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      ...(extra || {}),
    };
  }

  async json<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit,
    retriedAuth = false
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.PW_E2E_FETCH_TIMEOUT_MS || 180_000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
        method,
        headers: this.headers(
          body !== undefined ? { 'Content-Type': 'application/json' } : undefined
        ),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...init,
      });
      if (
        res.status === 401 &&
        !retriedAuth &&
        this.tdEmail &&
        this.tdPassword
      ) {
        clearTimeout(timer);
        await this.login(this.tdEmail, this.tdPassword);
        return this.json<T>(method, path, body, init, true);
      }
      if (!res.ok) {
        throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
      }
      if (res.status === 204) {
        return undefined as T;
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.json<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.json<T>('POST', path, body);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.json<T>('PATCH', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.json<T>('PUT', path, body);
  }

  async uploadCsv(
    path: string,
    filename: string,
    csvText: string,
    retriedAuth = false
  ): Promise<unknown> {
    const form = new FormData();
    form.append('file', new Blob([csvText], { type: 'text/csv' }), filename);
    const controller = new AbortController();
    const timeoutMs = Number(process.env.PW_E2E_FETCH_TIMEOUT_MS || 600_000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: form,
        signal: controller.signal,
      });
      if (
        res.status === 401 &&
        !retriedAuth &&
        this.tdEmail &&
        this.tdPassword
      ) {
        clearTimeout(timer);
        await this.login(this.tdEmail, this.tdPassword);
        return this.uploadCsv(path, filename, csvText, true);
      }
      if (!res.ok) {
        throw new Error(`CSV upload ${path} → ${res.status}: ${await res.text()}`);
      }
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async downloadText(path: string, retriedAuth = false): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      headers: this.headers(),
    });
    if (
      res.status === 401 &&
      !retriedAuth &&
      this.tdEmail &&
      this.tdPassword
    ) {
      await this.login(this.tdEmail, this.tdPassword);
      return this.downloadText(path, true);
    }
    if (!res.ok) {
      throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
    }
    return res.text();
  }
}
