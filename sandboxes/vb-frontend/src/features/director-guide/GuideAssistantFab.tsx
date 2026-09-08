import React, { useEffect, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { useDirectorGuide } from './GuideProvider';
import { useWebSpeechInput } from './useWebSpeechInput';

/**
 * Floating chat assistant (typed + optional Web Speech).
 */
const GuideAssistantFab: React.FC = () => {
  const {
    panelOpen,
    setPanelOpen,
    messages,
    handleUserUtterance,
    confirmParticipantChoice,
    session,
  } = useDirectorGuide();

  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const { supported, listening, error, toggle, clearError } = useWebSpeechInput((text) => {
    handleUserUtterance(text);
  });
  const pendingChoices = session.pendingParticipantResolve?.candidates ?? null;

  useEffect(() => {
    if (!panelOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, panelOpen, pendingChoices]);

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    handleUserUtterance(t);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[11000] flex flex-col items-end gap-2">
      {panelOpen && (
        <div
          className="assistant-chat-panel w-[min(100vw-2rem,24rem)] h-[min(90vh,54rem)] max-h-[min(90vh,54rem)] flex flex-col rounded-xl border border-border bg-surface shadow-xl overflow-hidden"
          role="dialog"
          aria-label="Assistant"
          style={{ ['--assistant-chat-size' as string]: '13px' }}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-surface-light">
            <div className="font-semibold text-text" style={{ fontSize: '14px' }}>
              Assistant
            </div>
            <button
              type="button"
              className="text-text-muted hover:text-text p-1 rounded-md hover:bg-surface"
              onClick={() => setPanelOpen(false)}
              aria-label="Close assistant"
            >
              <CloseIcon fontSize="small" aria-hidden />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-2.5 py-1.5 max-w-[95%] whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'ml-auto bg-primary text-white'
                    : 'mr-auto bg-surface-light text-text'
                }`}
                style={{ fontSize: 'var(--assistant-chat-size)' }}
              >
                {m.text}
              </div>
            ))}
            {pendingChoices && pendingChoices.length > 0 && (
              <div className="flex flex-col gap-1 mr-auto max-w-[95%]" role="group" aria-label="Bowler choices">
                {pendingChoices.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    className="rounded-md border border-border bg-surface-light text-text text-left px-2.5 py-1.5 hover:bg-surface"
                    style={{ fontSize: 'var(--assistant-chat-size)' }}
                    onClick={() => confirmParticipantChoice(i)}
                  >
                    {i + 1}. {c.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-2 space-y-1">
            {(error || (!supported && panelOpen)) && (
              <p className="text-text-muted px-1" style={{ fontSize: '12px' }}>
                {error || 'Voice unavailable — type instead.'}
              </p>
            )}
            <div className="flex gap-1 items-end">
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
                placeholder="Ask or type a step… e.g. Create tournament"
                className="flex-1 resize-none rounded-md border border-border bg-bg px-2 py-1.5 text-text outline-none focus:ring-2 focus:ring-primary"
                style={{ fontSize: 'var(--assistant-chat-size)' }}
                aria-label="Assistant chat input"
              />
              <button
                type="button"
                className={`rounded-md border border-border px-2 py-2 inline-flex items-center justify-center ${
                  listening ? 'bg-danger/15 text-danger' : 'bg-surface-light text-text'
                }`}
                onClick={toggle}
                title={supported ? (listening ? 'Stop listening' : 'Speak') : 'Voice unavailable'}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
              >
                <MicIcon fontSize="small" aria-hidden />
              </button>
              <button
                type="button"
                className="rounded-md bg-primary text-white px-3 py-2 font-semibold"
                style={{ fontSize: 'var(--assistant-chat-size)' }}
                onClick={submit}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`rounded-full shadow-lg p-3.5 focus:outline-none focus:ring-2 focus:ring-primary ${
          panelOpen
            ? 'bg-accent text-white hover:bg-accent/90'
            : 'bg-primary text-white hover:bg-primary-light'
        }`}
        onClick={() => setPanelOpen(!panelOpen)}
        aria-expanded={panelOpen}
        aria-label={panelOpen ? 'Close Assistant' : 'Open Assistant'}
        data-guide-id="guide-assistant-fab"
        data-assistant-open={panelOpen ? 'true' : 'false'}
      >
        <PsychologyIcon fontSize="medium" aria-hidden />
      </button>
    </div>
  );
};

export default GuideAssistantFab;
