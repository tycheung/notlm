import { describe, expect, it } from 'vitest';
import { isRefusedSecretPath, loadLlmEnv } from './env.js';

describe('loadLlmEnv', () => {
  it('loads ollama from process env', () => {
    const env = loadLlmEnv({
      UIPILOT_LLM_PROVIDER: 'ollama',
      UIPILOT_LLM_BASE_URL: 'http://127.0.0.1:11434',
      UIPILOT_LLM_MODEL: 'llama3.2',
    });
    expect(env).toEqual({
      provider: 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      apiKey: undefined,
      model: 'llama3.2',
    });
  });

  it('requires api key for openai-compat', () => {
    expect(() =>
      loadLlmEnv({
        UIPILOT_LLM_PROVIDER: 'openai-compat',
        UIPILOT_LLM_BASE_URL: 'https://api.example.com',
        UIPILOT_LLM_MODEL: 'gpt-test',
      })
    ).toThrow(/UIPILOT_LLM_API_KEY/);
  });

  it('refuses committed-looking secret filenames', () => {
    expect(isRefusedSecretPath('.env')).toBe(true);
    expect(isRefusedSecretPath('apps/demo/.env.local')).toBe(true);
    expect(isRefusedSecretPath('config.json')).toBe(false);
  });
});
