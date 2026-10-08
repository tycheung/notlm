import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNotLM } from './NotLMContext.js';
import { useWebSpeechInput } from './useWebSpeechInput.js';
import { ChatMessages } from './ChatMessages.js';
import { ChatComposer } from './ChatComposer.js';
import { ThreadList } from './ThreadList.js';
import { useFocusTrap } from './useFocusTrap.js';
import { cx } from './cx.js';

export function NotLMFab() {
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
    fallbackBusy,
    cancelFallback,
    regenerateLastFallback,
    threads,
    activeThreadId,
    selectThread,
    newThread,
  } = useNotLM();
  const [draft, setDraft] = useState('');
  const queuedWhileBusy = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const voiceEnabled = features.voice !== false;
  const classNames = chrome.classNames;
  const components = chrome.components;
  const labels = chrome.labels;
  const assistantTitle = labels?.assistantTitle ?? 'Assistant';

  const { supported, listening, error, toggle, clearError } = useWebSpeechInput((text) => {
    handleUserUtterance(text);
  });

  useEffect(() => {
    if (!panelOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, panelOpen]);

  useEffect(() => {
    if (fallbackBusy) return;
    const queued = queuedWhileBusy.current?.trim();
    if (!queued) return;
    queuedWhileBusy.current = null;
    handleUserUtterance(queued);
  }, [fallbackBusy, handleUserUtterance]);

  const closePanel = useCallback(() => setPanelOpen(false), [setPanelOpen]);
  useFocusTrap(panelOpen, panelRef, closePanel);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (fallbackBusy) {
      queuedWhileBusy.current = text;
      setDraft('');
      return;
    }
    setDraft('');
    handleUserUtterance(text);
  };

  const FabButton = components?.FabButton;
  const ChatHeader = components?.ChatHeader;
  const ChatPanel = components?.ChatPanel;

  const headerNode: ReactNode = ChatHeader ? (
    <ChatHeader
      title={assistantTitle}
      onClose={closePanel}
      className={cx('notlm-chat-header', classNames?.chatHeader)}
    />
  ) : (
    <div className={cx('notlm-chat-header', classNames?.chatHeader)}>
      <span>{titleWithThreads(assistantTitle, threads.length)}</span>
      <button
        type="button"
        className="notlm-chat-close"
        onClick={closePanel}
        aria-label="Close assistant"
      >
        ×
      </button>
    </div>
  );

  const messagesNode = (
    <ChatMessages
      messages={messages}
      className={classNames?.chatMessages}
      listRef={listRef}
      onChoice={(label) => handleUserUtterance(label)}
      onLinkAction={(action) => {
        if (action === 'open_checklist') setChecklistOpen(true);
      }}
      onCopy={(text) => {
        void navigator.clipboard?.writeText?.(text);
      }}
      onRegenerate={() => regenerateLastFallback()}
      regenerateLabel={labels?.regenerateLabel}
      copyLabel={labels?.copyLabel}
    />
  );

  const inputRow = (
    <ChatComposer
      value={draft}
      onChange={(v) => {
        setDraft(v);
        if (error) clearError();
      }}
      onSubmit={submit}
      onCancel={cancelFallback}
      busy={fallbackBusy}
      inputClassName={classNames?.chatInput}
      placeholder={labels?.composerPlaceholder ?? 'Ask or type a step…'}
      sendLabel={labels?.sendLabel ?? 'Send'}
      cancelLabel={labels?.cancelLabel ?? 'Cancel'}
      voiceEnabled={voiceEnabled}
      listening={listening}
      voiceSupported={supported}
      onToggleVoice={toggle}
      voiceError={error}
    />
  );

  const voiceHint =
    voiceEnabled && (error || !supported) ? (
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--notlm-text-muted)',
          padding: '0 0.5rem 0.5rem',
        }}
      >
        {error || 'Voice unavailable — type instead.'}
      </p>
    ) : null;

  const threadNode =
    features.threads !== false ? (
      <ThreadList
        threads={threads}
        activeThreadId={activeThreadId}
        onSelect={selectThread}
        onNew={newThread}
      />
    ) : null;

  const panelInner = ChatPanel ? (
    <ChatPanel
      header={headerNode}
      messages={
        <>
          {threadNode}
          {messagesNode}
        </>
      }
      inputRow={inputRow}
      voiceHint={voiceHint}
      className={cx('notlm-chat-panel', classNames?.chatPanel)}
    />
  ) : (
    <div
      ref={panelRef}
      className={cx('notlm-chat-panel', classNames?.chatPanel)}
      role="dialog"
      aria-modal="true"
      aria-label={assistantTitle}
      data-testid="notlm-chat-panel"
    >
      {headerNode}
      {threadNode}
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
      className={cx(hostRootClassName, 'notlm-fab-root', classNames?.fabRoot)}
      style={hostRootStyle}
      data-testid="notlm-fab-dock"
      data-chat-enabled={chatEnabled ? 'true' : 'false'}
    >
      {chatEnabled && panelOpen && panelInner}

      {checklistEnabled && (
        <button
          type="button"
          className={cx(
            'notlm-fab-btn',
            'notlm-fab-btn-secondary',
            'notlm-checklist-fab',
            classNames?.fabButton
          )}
          onClick={toggleChecklist}
          aria-expanded={checklistOpen}
          aria-label={checklistOpen ? 'Close checklist' : 'Open checklist'}
          data-guide-id="guide-checklist-fab"
          data-testid="notlm-checklist-fab"
          data-checklist-open={checklistOpen ? 'true' : 'false'}
          title="Checklist (setup & run status)"
        >
          <svg
            className="notlm-fab-icon"
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
            className={cx('notlm-fab-btn', classNames?.fabButton)}
          />
        ) : (
          <button
            type="button"
            className={cx('notlm-fab-btn', classNames?.fabButton)}
            onClick={toggleAssistant}
            aria-expanded={panelOpen}
            aria-label={panelOpen ? 'Close assistant' : 'Open assistant'}
            data-guide-id="guide-assistant-fab"
            data-testid="notlm-fab"
            data-assistant-open={panelOpen ? 'true' : 'false'}
          >
            <svg
              className="notlm-fab-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M13 8.57c-.79 0-1.43.64-1.43 1.43s.64 1.43 1.43 1.43 1.43-.64 1.43-1.43-.64-1.43-1.43-1.43" />
              <path d="M13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2c-.25.33-.01.8.4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7m3 7c0 .13-.01.26-.02.39l.83.66c.08.06.1.16.05.25l-.8 1.39c-.05.09-.16.12-.24.09l-.99-.4c-.21.16-.43.29-.67.39L14 13.83c-.01.1-.1.17-.2.17h-1.6c-.1 0-.18-.07-.2-.17l-.15-1.06c-.25-.1-.47-.23-.68-.39l-.99.4c-.09.03-.2 0-.25-.09l-.8-1.39c-.05-.08-.03-.19.05-.25l.84-.66c-.01-.13-.02-.26-.02-.39s.02-.27.04-.39l-.85-.66c-.08-.06-.1-.16-.05-.26l.8-1.38c.05-.09.15-.12.24-.09l1 .4c.2-.15.43-.29.67-.39L12 6.17c.02-.1.1-.17.2-.17h1.6c.1 0 .18.07.2.17l.15 1.06c.24.1.46.23.67.39l1-.4c.09-.03.2 0 .24.09l.8 1.38c.05.09.03.2-.05.26l-.85.66c.03.12.04.25.04.39" />
            </svg>
          </button>
        ))}
    </div>
  );
}

function titleWithThreads(title: string, count: number): string {
  return count > 1 ? `${title} · ${count}` : title;
}
