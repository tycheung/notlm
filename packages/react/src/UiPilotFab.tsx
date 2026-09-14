import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useUiPilot } from './UiPilotContext.js';
import { useWebSpeechInput } from './useWebSpeechInput.js';

function cx(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

export function UiPilotFab() {
  const {
    panelOpen,
    setPanelOpen,
    setChecklistOpen,
    messages,
    handleUserUtterance,
    features,
    chrome,
    hostRootStyle,
    hostRootClassName,
  } = useUiPilot();
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const voiceEnabled = features.voice !== false;
  const classNames = chrome.classNames;
  const components = chrome.components;

  const { supported, listening, error, toggle, clearError } = useWebSpeechInput((text) => {
    handleUserUtterance(text);
  });

  useEffect(() => {
    if (!panelOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, panelOpen]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    handleUserUtterance(text);
  };

  const FabButton = components?.FabButton;
  const ChatHeader = components?.ChatHeader;
  const ChatPanel = components?.ChatPanel;
  const labels = chrome.labels;
  const assistantTitle = labels?.assistantTitle ?? 'Assistant';

  const headerNode: ReactNode = ChatHeader ? (
    <ChatHeader
      title={assistantTitle}
      onClose={() => setPanelOpen(false)}
      className={cx('uipilot-chat-header', classNames?.chatHeader)}
    />
  ) : (
    <div className={cx('uipilot-chat-header', classNames?.chatHeader)}>
      <span>{assistantTitle}</span>
      <button
        type="button"
        className="uipilot-chat-close"
        onClick={() => setPanelOpen(false)}
        aria-label="Close assistant"
      >
        ×
      </button>
    </div>
  );

  const messagesNode = (
    <div ref={listRef} className={cx('uipilot-chat-messages', classNames?.chatMessages)}>
      {messages.map((m) => (
        <div key={m.id} className="uipilot-chat-turn">
          <div
            className={`uipilot-chat-bubble ${
              m.role === 'user' ? 'uipilot-chat-bubble-user' : 'uipilot-chat-bubble-assistant'
            }`}
          >
            {m.text}
          </div>
          {m.role === 'assistant' && m.choices && m.choices.length > 0 && (
            <div className="uipilot-chat-choices" role="group" aria-label="Suggested steps">
              {m.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="uipilot-chat-choice"
                  data-testid={`uipilot-choice-${c.id}`}
                  onClick={() => {
                    handleUserUtterance(c.label);
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {m.role === 'assistant' && m.links && m.links.length > 0 && (
            <div className="uipilot-chat-links" role="group" aria-label="Help links">
              {m.links.map((link, i) =>
                link.href ? (
                  <a
                    key={`${link.label}-${i}`}
                    className="uipilot-chat-link"
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
                    className="uipilot-chat-link"
                    onClick={() => {
                      if (link.action === 'open_checklist') {
                        setChecklistOpen(true);
                      }
                    }}
                  >
                    {link.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const inputRow = (
    <div className="uipilot-chat-input-row">
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) clearError();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        className={cx('uipilot-chat-input', classNames?.chatInput)}
        placeholder="Ask or type a step…"
        aria-label="Assistant chat input"
        data-testid="uipilot-chat-input"
      />
      {voiceEnabled && (
        <button
          type="button"
          className={`uipilot-chat-btn ${listening ? 'uipilot-chat-btn-listening' : ''}`}
          onClick={toggle}
          title={supported ? (listening ? 'Stop listening' : 'Speak') : 'Voice unavailable'}
          aria-label={listening ? 'Stop voice input' : 'Start voice input'}
        >
          Mic
        </button>
      )}
      <button
        type="button"
        className="uipilot-chat-btn uipilot-chat-btn-primary"
        onClick={submit}
        data-testid="uipilot-chat-send"
      >
        Send
      </button>
    </div>
  );

  const voiceHint =
    voiceEnabled && (error || !supported) ? (
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--uipilot-text-muted)',
          padding: '0 0.5rem 0.5rem',
        }}
      >
        {error || 'Voice unavailable — type instead.'}
      </p>
    ) : null;

  const panelInner = ChatPanel ? (
    <ChatPanel
      header={headerNode}
      messages={messagesNode}
      inputRow={inputRow}
      voiceHint={voiceHint}
      className={cx('uipilot-chat-panel', classNames?.chatPanel)}
    />
  ) : (
    <div
      className={cx('uipilot-chat-panel', classNames?.chatPanel)}
      role="dialog"
      aria-label={assistantTitle}
    >
      {headerNode}
      {messagesNode}
      {inputRow}
      {voiceHint}
    </div>
  );

  return (
    <div
      className={cx(hostRootClassName, 'uipilot-fab-root', classNames?.fabRoot)}
      style={hostRootStyle}
    >
      {panelOpen && panelInner}

      {FabButton ? (
        <FabButton
          open={panelOpen}
          onToggle={() => setPanelOpen(!panelOpen)}
          className={cx('uipilot-fab-btn', classNames?.fabButton)}
        />
      ) : (
        <button
          type="button"
          className={cx('uipilot-fab-btn', classNames?.fabButton)}
          onClick={() => setPanelOpen(!panelOpen)}
          aria-expanded={panelOpen}
          aria-label={panelOpen ? 'Close assistant' : 'Open assistant'}
          data-guide-id="guide-assistant-fab"
          data-testid="uipilot-fab"
          data-assistant-open={panelOpen ? 'true' : 'false'}
        >
          <svg
            className="uipilot-fab-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            {/* Brain / psychology mark — default FAB glyph */}
            <path d="M13 3c-1.95 0-3.64 1.16-4.38 2.82C7.97 5.3 7.03 5 6 5 3.79 5 2 6.79 2 9c0 1.48.81 2.77 2 3.46V19c0 1.1.9 2 2 2h7c1.1 0 2-.9 2-2v-1.54c1.19-.69 2-1.98 2-3.46 0-.34-.04-.67-.1-.99.66-.55 1.1-1.36 1.1-2.28 0-1.31-.84-2.41-2-2.83V8c0-2.76-2.24-5-5-5zm-1 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-5.5c-.83 0-1.5-.67-1.5-1.5S12.67 9 13.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM8.5 12C7.67 12 7 11.33 7 10.5S7.67 9 8.5 9s1.5.67 1.5 1.5S9.33 12 8.5 12z" />
          </svg>
        </button>
      )}
    </div>
  );
}
