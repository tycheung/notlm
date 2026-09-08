import { describe, expect, it, vi } from 'vitest';
import { createOllamaProvider } from './providers/ollama.js';
import { createOpenAiCompatProvider } from './providers/openaiCompat.js';
import { createProvider } from './providers/createProvider.js';
import type { LlmProvider } from './types.js';

describe('providers', () => {
  it('ollama posts to /api/chat', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ message: { content: '{"ok":true}' } }),
    })) as unknown as typeof fetch;

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      fetchImpl,
    });

    const text = await provider.completeChat({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(text).toBe('{"ok":true}');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('openai-compat sends Bearer Authorization', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer test-key');
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'done' } }],
        }),
      };
    }) as unknown as typeof fetch;

    const provider = createOpenAiCompatProvider({
      baseUrl: 'https://api.example.com',
      model: 'gpt-test',
      apiKey: 'test-key',
      fetchImpl,
    });

    await provider.completeChat({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('createProvider selects ollama from env shape', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ message: { content: 'x' } }),
    })) as unknown as typeof fetch;

    const provider: LlmProvider = createProvider(
      {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'm',
      },
      fetchImpl
    );
    await provider.completeChat({ messages: [{ role: 'user', content: 'a' }] });
    expect(fetchImpl).toHaveBeenCalled();
  });
});
