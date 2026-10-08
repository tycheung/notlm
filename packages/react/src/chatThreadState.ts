import type { ChatChoice, ChatMessage } from '@notlm/core';
import type { ChatThread } from './ThreadList.js';

export const DEFAULT_WELCOME =
  'How can I help? Ask for a workflow step or open the command palette.';

const THREAD_STORAGE_PREFIX = 'notlm:threads:';
const MAX_PERSISTED_MESSAGES = 80;

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

type PersistedChat = {
  activeThreadId: string;
  threads: ChatThread[];
  messagesByThread: Record<string, ChatMessage[]>;
};

export function loadPersistedThreads(packId: string): PersistedChat | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${THREAD_STORAGE_PREFIX}${packId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChat;
    if (!parsed?.activeThreadId || !Array.isArray(parsed.threads)) return null;
    if (!parsed.messagesByThread || typeof parsed.messagesByThread !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistThreads(
  packId: string,
  state: {
    activeThreadId: string;
    threads: ChatThread[];
    messagesByThread: Record<string, ChatMessage[]>;
  }
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const trimmed: Record<string, ChatMessage[]> = {};
    for (const [tid, msgs] of Object.entries(state.messagesByThread)) {
      trimmed[tid] = msgs.slice(-MAX_PERSISTED_MESSAGES).map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        at: m.at,
        ...(m.choices ? { choices: m.choices } : {}),
        ...(m.links ? { links: m.links } : {}),
        ...(m.intentKey ? { intentKey: m.intentKey } : {}),
        ...(m.status ? { status: m.status } : {}),
      }));
    }
    const payload: PersistedChat = {
      activeThreadId: state.activeThreadId,
      threads: state.threads,
      messagesByThread: trimmed,
    };
    localStorage.setItem(
      `${THREAD_STORAGE_PREFIX}${packId}`,
      JSON.stringify(payload)
    );
  } catch {
    /* quota / private mode */
  }
}
