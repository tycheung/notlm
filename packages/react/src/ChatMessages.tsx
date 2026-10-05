import type { ChatMessage } from '@notlm/core';
import type { ReactNode, RefObject } from 'react';
import { parseSafeMarkdown } from './safeMarkdown.js';
import { cx } from './cx.js';

function AssistantBody({ text, status }: { text: string; status?: ChatMessage['status'] }) {
  if (status === 'thinking') {
    return (
      <span className="notlm-chat-thinking" aria-busy="true">
        <span className="notlm-chat-spinner" aria-hidden="true" />
        {text}
      </span>
    );
  }
  const nodes = parseSafeMarkdown(text);
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === 'text') return <span key={i}>{n.text}</span>;
        if (n.type === 'bold') return <strong key={i}>{n.text}</strong>;
        if (n.type === 'code')
          return (
            <code key={i} className="notlm-chat-md-code">
              {n.text}
            </code>
          );
        return (
          <a
            key={i}
            className="notlm-chat-md-link"
            href={n.href}
            target="_blank"
            rel="noreferrer"
          >
            {n.label}
          </a>
        );
      })}
      {status === 'streaming' ? (
        <span className="notlm-chat-cursor" aria-hidden="true">
          ▍
        </span>
      ) : null}
    </>
  );
}

export type ChatMessagesProps = {
  messages: ChatMessage[];
  className?: string;
  listRef?: RefObject<HTMLDivElement>;
  thinkingLabel?: string;
  onChoice?: (label: string) => void;
  onLinkAction?: (action: string) => void;
  onRegenerate?: (message: ChatMessage) => void;
  onCopy?: (text: string) => void;
  regenerateLabel?: string;
  copyLabel?: string;
  liveRegionId?: string;
};

export function ChatMessages({
  messages,
  className,
  listRef,
  onChoice,
  onLinkAction,
  onRegenerate,
  onCopy,
  regenerateLabel = 'Regenerate',
  copyLabel = 'Copy',
  liveRegionId = 'notlm-chat-live',
}: ChatMessagesProps): ReactNode {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const liveText =
    lastAssistant?.status === 'thinking' || lastAssistant?.status === 'streaming'
      ? lastAssistant.text
      : lastAssistant?.status === 'final' || lastAssistant?.status === 'error'
        ? lastAssistant.text
        : '';

  return (
    <>
      <div
        id={liveRegionId}
        className="notlm-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveText}
      </div>
      <div
        ref={listRef}
        className={cx('notlm-chat-messages', className)}
        data-testid="notlm-chat-messages"
      >
        {messages.map((m) => {
          const busy = m.status === 'thinking' || m.status === 'streaming';
          const showActions =
            m.role === 'assistant' &&
            (m.status === 'final' || m.status === 'error' || !m.status) &&
            Boolean(m.text);
          return (
            <div key={m.id} className="notlm-chat-turn" data-status={m.status ?? 'final'}>
              <div
                className={cx(
                  'notlm-chat-bubble',
                  m.role === 'user'
                    ? 'notlm-chat-bubble-user'
                    : 'notlm-chat-bubble-assistant',
                  m.status === 'thinking' && 'notlm-chat-bubble-thinking',
                  m.status === 'streaming' && 'notlm-chat-bubble-streaming',
                  m.status === 'error' && 'notlm-chat-bubble-error'
                )}
                aria-busy={busy || undefined}
              >
                {m.role === 'assistant' ? (
                  <AssistantBody text={m.text} status={m.status} />
                ) : (
                  m.text
                )}
              </div>
              {m.role === 'assistant' && m.choices && m.choices.length > 0 && (
                <div className="notlm-chat-choices" role="group" aria-label="Suggested steps">
                  {m.choices.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="notlm-chat-choice"
                      data-testid={`notlm-choice-${c.id}`}
                      onClick={() => onChoice?.(c.label)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              {m.role === 'assistant' && m.links && m.links.length > 0 && (
                <div className="notlm-chat-links" role="group" aria-label="Help links">
                  {m.links.map((link, i) =>
                    link.href ? (
                      <a
                        key={`${link.label}-${i}`}
                        className="notlm-chat-link"
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <button
                        key={`${link.label}-${i}`}
                        type="button"
                        className="notlm-chat-link"
                        onClick={() => {
                          if (link.action) onLinkAction?.(link.action);
                        }}
                      >
                        {link.label}
                      </button>
                    )
                  )}
                </div>
              )}
              {showActions && (onRegenerate || onCopy) ? (
                <div className="notlm-chat-actions" role="group" aria-label="Message actions">
                  {onCopy ? (
                    <button
                      type="button"
                      className="notlm-chat-action"
                      onClick={() => onCopy(m.text)}
                    >
                      {copyLabel}
                    </button>
                  ) : null}
                  {onRegenerate && m === lastAssistant ? (
                    <button
                      type="button"
                      className="notlm-chat-action"
                      data-testid="notlm-chat-regenerate"
                      onClick={() => onRegenerate(m)}
                    >
                      {regenerateLabel}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

