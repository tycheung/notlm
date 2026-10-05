import type { ChatChoice, ChatMessage } from '@notlm/core';
import type { ChatThread } from './ThreadList.js';

export const DEFAULT_WELCOME =
  'How can I help? Ask for a workflow step or open the command palette.';

export function newChatMessage(
  role: ChatMessage['role'],
  text: string,
  choices?: ChatChoice[],
  extra?: { links?: ChatMessage['links']; intentKey?: string }
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    at: Date.now(),
    ...(choices?.length ? { choices } : {}),
    ...(extra?.links?.length ? { links: extra.links } : {}),
    ...(extra?.intentKey ? { intentKey: extra.intentKey } : {}),
  };
}

export function initialThreadState(threadId: string): {
  threads: ChatThread[];
  messagesByThread: Record<string, ChatMessage[]>;
} {
  return {
    threads: [{ id: threadId, title: 'Chat', updatedAt: Date.now() }],
    messagesByThread: {
      [threadId]: [newChatMessage('assistant', DEFAULT_WELCOME)],
    },
  };
}
