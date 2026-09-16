import { useEffect } from 'react';
import { useUiPilot } from './UiPilotContext.js';

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
  } = useUiPilot();

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
      className={[hostRootClassName, 'uipilot-checklist-root'].filter(Boolean).join(' ')}
      style={hostRootStyle}
      data-testid="uipilot-checklist"
    >
      <button
        type="button"
        className="uipilot-checklist-backdrop"
        aria-label="Close checklist"
        onClick={() => setChecklistOpen(false)}
      />
      <div
        className="uipilot-checklist-panel"
        role="dialog"
        aria-label="Event checklist"
      >
        <div className="uipilot-checklist-header">
          <strong>Event checklist</strong>
          <button
            type="button"
            className="uipilot-checklist-close"
            onClick={() => setChecklistOpen(false)}
            aria-label="Close checklist"
          >
            ×
          </button>
        </div>
        <ul className="uipilot-checklist-list" role="list">
          {statuses.map((s) => {
            const disabled = !s.available && !s.complete;
            return (
              <li key={s.id} className="uipilot-checklist-item">
                <button
                  type="button"
                  className="uipilot-checklist-row"
                  disabled={disabled}
                  data-guide-id={`uipilot-checklist-${s.id}`}
                  onClick={() => {
                    if (disabled) return;
                    setChecklistOpen(false);
                    executeStep(s.id);
                  }}
                >
                  <span className="uipilot-checklist-title">{s.title}</span>
                  {s.phaseLabel ? (
                    <span className="uipilot-checklist-phase">{s.phaseLabel}</span>
                  ) : null}
                  <span className="uipilot-checklist-state">
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
