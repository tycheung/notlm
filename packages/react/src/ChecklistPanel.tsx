import { useEffect } from 'react';
import { useNotLM } from './NotLMContext.js';

/**
 * Portable checklist over evaluateFlowStatuses (+ optional phase labels).
 * Applies host-root tokens so surface/text vars resolve outside nested chrome.
 */
export function ChecklistPanel() {
  const {
    features,
    checklistOpen,
    setChecklistOpen,
    statuses,
    executeStep,
    hostRootClassName,
    hostRootStyle,
    chrome,
  } = useNotLM();

  const title = chrome.labels?.checklistTitle ?? 'Checklist';

  useEffect(() => {
    if (!checklistOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setChecklistOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checklistOpen, setChecklistOpen]);

  if (features.checklist === false || !checklistOpen) return null;

  return (
    <div
      className={[hostRootClassName, 'notlm-checklist-root'].filter(Boolean).join(' ')}
      style={hostRootStyle}
      data-testid="notlm-checklist"
    >
      <button
        type="button"
        className="notlm-checklist-backdrop"
        aria-label="Close checklist"
        onClick={() => setChecklistOpen(false)}
      />
      <div
        className="notlm-checklist-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="notlm-checklist-header">
          <strong>{title}</strong>
          <button
            type="button"
            className="notlm-checklist-close"
            onClick={() => setChecklistOpen(false)}
            aria-label="Close checklist"
          >
            ×
          </button>
        </div>
        <ul className="notlm-checklist-list" role="list">
          {statuses.map((s) => {
            const disabled = !s.available && !s.complete;
            return (
              <li key={s.id} className="notlm-checklist-item">
                <button
                  type="button"
                  className="notlm-checklist-row"
                  disabled={disabled}
                  data-guide-id={`notlm-checklist-${s.id}`}
                  onClick={() => {
                    if (disabled) return;
                    setChecklistOpen(false);
                    executeStep(s.id);
                  }}
                >
                  <span className="notlm-checklist-title">{s.title}</span>
                  {s.phaseLabel ? (
                    <span className="notlm-checklist-phase">{s.phaseLabel}</span>
                  ) : null}
                  <span className="notlm-checklist-state">
                    {s.complete ? 'Done' : s.available ? 'Ready' : s.blockedReason ?? 'Blocked'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
