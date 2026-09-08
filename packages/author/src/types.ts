/** LLM chat types for build-time authoring (not runtime coach chat). */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CompleteChatRequest = {
  messages: ChatMessage[];
};

export interface LlmProvider {
  completeChat(request: CompleteChatRequest): Promise<string>;
}

export type LlmProviderKind = 'ollama' | 'openai-compat';

export type LlmEnv = {
  provider: LlmProviderKind;
  baseUrl: string;
  apiKey?: string;
  model: string;
};
