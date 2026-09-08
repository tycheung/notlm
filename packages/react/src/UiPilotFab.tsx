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

  const headerNode: ReactNode = ChatHeader ? (
    <ChatHeader
      title="Assistant"
      onClose={() => setPanelOpen(false)}
      className={cx('uipilot-chat-header', classNames?.chatHeader)}
    />
  ) : (
    <div className={cx('uipilot-chat-header', classNames?.chatHeader)}>
      <span>Assistant</span>
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
      aria-label="Assistant"
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
        >
          ?
        </button>
      )}
    </div>
  );
}
