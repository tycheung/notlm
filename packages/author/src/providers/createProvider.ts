import { loadLlmEnv } from '../env.js';
import type { LlmEnv, LlmProvider } from '../types.js';
import { createOllamaProvider } from './ollama.js';
import { createOpenAiCompatProvider } from './openaiCompat.js';

export function createProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: typeof fetch
): LlmProvider {
  return createProvider(loadLlmEnv(env), fetchImpl);
}

export function createProvider(llm: LlmEnv, fetchImpl?: typeof fetch): LlmProvider {
  if (llm.provider === 'ollama') {
    return createOllamaProvider({
      baseUrl: llm.baseUrl,
      model: llm.model,
      mode: 'native',
      fetchImpl,
    });
  }

  if (!llm.apiKey) {
    throw new Error('apiKey required for openai-compat provider');
  }

  return createOpenAiCompatProvider({
    baseUrl: llm.baseUrl,
    model: llm.model,
    apiKey: llm.apiKey,
    fetchImpl,
  });
}
