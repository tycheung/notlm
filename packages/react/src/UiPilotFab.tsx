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
    checklistOpen,
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

  const chatEnabled = features.chat !== false;
  const checklistEnabled = features.checklist !== false;
  if (!chatEnabled && !checklistEnabled) return null;

  const toggleChecklist = () => {
    setPanelOpen(false);
    setChecklistOpen(!checklistOpen);
  };

  const toggleAssistant = () => {
    setChecklistOpen(false);
    setPanelOpen(!panelOpen);
  };

  return (
    <div
      className={cx(hostRootClassName, 'uipilot-fab-root', classNames?.fabRoot)}
      style={hostRootStyle}
      data-testid="uipilot-fab-dock"
      data-chat-enabled={chatEnabled ? 'true' : 'false'}
    >
      {chatEnabled && panelOpen && panelInner}

      {/* Checklist sits above the assistant; alone it anchors at the dock bottom. */}
      {checklistEnabled && (
        <button
          type="button"
          className={cx(
            'uipilot-fab-btn',
            'uipilot-fab-btn-secondary',
            'uipilot-checklist-fab',
            classNames?.fabButton
          )}
          onClick={toggleChecklist}
          aria-expanded={checklistOpen}
          aria-label={checklistOpen ? 'Close checklist' : 'Open checklist'}
          data-guide-id="guide-checklist-fab"
          data-testid="uipilot-checklist-fab"
          data-checklist-open={checklistOpen ? 'true' : 'false'}
          title="Checklist (setup & run status)"
        >
          <svg
            className="uipilot-fab-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M3 5h2v2H3V5zm4 0h14v2H7V5zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 17h2v2H3v-2zm4 0h14v2H7v-2z" />
          </svg>
        </button>
      )}

      {chatEnabled &&
        (FabButton ? (
          <FabButton
            open={panelOpen}
            onToggle={toggleAssistant}
            className={cx('uipilot-fab-btn', classNames?.fabButton)}
          />
        ) : (
          <button
            type="button"
            className={cx('uipilot-fab-btn', classNames?.fabButton)}
            onClick={toggleAssistant}
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
              {/* Material Psychology (brain) — keep in sync with @mui/icons-material/Psychology */}
              <path d="M13 8.57c-.79 0-1.43.64-1.43 1.43s.64 1.43 1.43 1.43 1.43-.64 1.43-1.43-.64-1.43-1.43-1.43" />
              <path d="M13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2c-.25.33-.01.8.4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7m3 7c0 .13-.01.26-.02.39l.83.66c.08.06.1.16.05.25l-.8 1.39c-.05.09-.16.12-.24.09l-.99-.4c-.21.16-.43.29-.67.39L14 13.83c-.01.1-.1.17-.2.17h-1.6c-.1 0-.18-.07-.2-.17l-.15-1.06c-.25-.1-.47-.23-.68-.39l-.99.4c-.09.03-.2 0-.25-.09l-.8-1.39c-.05-.08-.03-.19.05-.25l.84-.66c-.01-.13-.02-.26-.02-.39s.02-.27.04-.39l-.85-.66c-.08-.06-.1-.16-.05-.26l.8-1.38c.05-.09.15-.12.24-.09l1 .4c.2-.15.43-.29.67-.39L12 6.17c.02-.1.1-.17.2-.17h1.6c.1 0 .18.07.2.17l.15 1.06c.24.1.46.23.67.39l1-.4c.09-.03.2 0 .24.09l.8 1.38c.05.09.03.2-.05.26l-.85.66c.03.12.04.25.04.39" />
            </svg>
          </button>
        ))}
    </div>
  );
}
