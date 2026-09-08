import type { LlmEnv, LlmProviderKind } from './types.js';

/**
 * Load UIPILOT_LLM_* from `process.env` only.
 *
 * Never reads `.env`, `.env.local`, `.env.production`, or other committed-looking
 * secret files from disk — inject credentials via the shell, CI secrets, or a
 * gitignored local config that the CLI loads into the environment first.
 * Hardcoded API keys are forbidden.
 */
export function loadLlmEnv(env: NodeJS.ProcessEnv = process.env): LlmEnv {
  const providerRaw = (env.UIPILOT_LLM_PROVIDER ?? '').trim().toLowerCase();
  const provider = normalizeProvider(providerRaw);
  if (!provider) {
    throw new Error(
      'UIPILOT_LLM_PROVIDER must be "ollama" or "openai-compat" (env only; do not commit secrets)'
    );
  }

  const baseUrl = (env.UIPILOT_LLM_BASE_URL ?? '').trim().replace(/\/$/, '');
  if (!baseUrl) {
    throw new Error('UIPILOT_LLM_BASE_URL is required');
  }

  const model = (env.UIPILOT_LLM_MODEL ?? '').trim();
  if (!model) {
    throw new Error('UIPILOT_LLM_MODEL is required');
  }

  const apiKey = (env.UIPILOT_LLM_API_KEY ?? '').trim() || undefined;

  if (provider === 'openai-compat' && !apiKey) {
    throw new Error('UIPILOT_LLM_API_KEY is required for openai-compat');
  }

  return { provider, baseUrl, apiKey, model };
}

function normalizeProvider(raw: string): LlmProviderKind | null {
  if (raw === 'ollama') return 'ollama';
  if (raw === 'openai-compat' || raw === 'openai_compatible' || raw === 'openai') {
    return 'openai-compat';
  }
  return null;
}

/** Paths that look like committed secret files — author must not read them. */
export const REFUSED_SECRET_PATHS = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'secrets.env',
  'credentials.json',
] as const;

export function isRefusedSecretPath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? '';
  return (REFUSED_SECRET_PATHS as readonly string[]).includes(normalized);
}
