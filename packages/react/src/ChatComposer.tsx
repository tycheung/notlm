import type { ReactNode } from 'react';
import { cx } from './cx.js';

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  busy?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  sendLabel?: string;
  cancelLabel?: string;
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
  busy = false,
  className,
  inputClassName,
  placeholder = 'Ask or type a step…',
  sendLabel = 'Send',
  cancelLabel = 'Cancel',
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
            if (!busy) onSubmit();
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
      {voiceEnabled && (
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
      )}
      {busy && onCancel ? (
        <button
          type="button"
          className="notlm-chat-btn"
          onClick={onCancel}
          data-testid="notlm-chat-cancel"
        >
          {cancelLabel}
        </button>
      ) : (
        <button
          type="button"
          className="notlm-chat-btn notlm-chat-btn-primary"
          onClick={onSubmit}
          disabled={busy || !value.trim()}
          data-testid="notlm-chat-send"
        >
          {sendLabel}
        </button>
      )}
      {voiceEnabled && voiceError ? (
        <span className="notlm-sr-only">{voiceError}</span>
      ) : null}
    </div>
  );
}
