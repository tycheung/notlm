import type { ReactNode } from 'react';
import { cx } from './cx.js';

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  /** Cursor-style left toolbar control (e.g. Clear Chat). */
  onClearChat?: () => void;
  busy?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  sendLabel?: string;
  cancelLabel?: string;
  clearChatLabel?: string;
  voiceEnabled?: boolean;
  listening?: boolean;
  voiceSupported?: boolean;
  onToggleVoice?: () => void;
  voiceError?: string | null;
};

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  onClearChat,
  busy = false,
  className,
  inputClassName,
  placeholder = 'Ask or type a step…',
  sendLabel = 'Send',
  cancelLabel = 'Cancel',
  clearChatLabel = 'Clear Chat',
  voiceEnabled = false,
  listening = false,
  voiceSupported = true,
  onToggleVoice,
  voiceError,
}: ChatComposerProps): ReactNode {
  return (
    <div className={cx('notlm-chat-input-row', className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Submit even while busy so rapid multi-send can FIFO-queue.
            onSubmit();
          }
        }}
        rows={2}
        className={cx('notlm-chat-input', inputClassName)}
        placeholder={
          busy ? 'Reply pending — you can type the next question…' : placeholder
        }
        aria-label="Assistant chat input"
        data-testid="notlm-chat-input"
        aria-busy={busy || undefined}
      />
      <div className="notlm-chat-toolbar">
        <div className="notlm-chat-toolbar-left">
          {onClearChat ? (
            <button
              type="button"
              className="notlm-chat-btn notlm-chat-btn-clear"
              onClick={onClearChat}
              disabled={busy}
              title="Clear chat and start over"
              data-testid="notlm-clear-chat"
            >
              {clearChatLabel}
            </button>
          ) : null}
        </div>
        <div className="notlm-chat-toolbar-right">
          {voiceEnabled ? (
            <button
              type="button"
              className={cx(
                'notlm-chat-btn',
                'notlm-chat-btn-mic',
                listening && 'notlm-chat-btn-listening'
              )}
              onClick={onToggleVoice}
              disabled={busy}
              title={
                voiceSupported
                  ? listening
                    ? 'Stop listening'
                    : 'Speak'
                  : 'Voice unavailable'
              }
              aria-label={listening ? 'Stop voice input' : 'Start voice input'}
              data-testid="notlm-chat-mic"
            >
              <svg
                className="notlm-mic-icon"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          ) : null}
          {busy && onCancel ? (
            <button
              type="button"
              className="notlm-chat-btn"
              onClick={onCancel}
              data-testid="notlm-chat-cancel"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="notlm-chat-btn notlm-chat-btn-primary"
            onClick={onSubmit}
            disabled={!value.trim()}
            data-testid="notlm-chat-send"
          >
            {sendLabel}
          </button>
        </div>
      </div>
      {voiceEnabled && voiceError ? (
        <span className="notlm-sr-only">{voiceError}</span>
      ) : null}
    </div>
  );
}
