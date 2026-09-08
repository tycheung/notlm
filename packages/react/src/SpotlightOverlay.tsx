import { useEffect, useLayoutEffect, useState } from 'react';
import { DEFAULT_GUIDE_ATTR } from './fieldFlash.js';
import type { SpotlightState } from './useSpotlightController.js';

type Props = {
  spotlight: SpotlightState;
  onDismiss: () => void;
  guideAttr?: string;
};

export function SpotlightOverlay({
  spotlight,
  onDismiss,
  guideAttr = DEFAULT_GUIDE_ATTR,
}: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!spotlight) {
      setRect(null);
      return;
    }
    const selector = `[${guideAttr}="${CSS.escape(spotlight.guideId)}"]`;
    const update = () => {
      const el = document.querySelector(selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [guideAttr, spotlight]);

  useEffect(() => {
    if (!spotlight) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss, spotlight]);

  if (!spotlight) return null;

  const pad = 8;
  const hole = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  return (
    <div className="uipilot-spotlight-root uipilot-host-root" role="dialog" aria-label="Guided highlight">
      <button
        type="button"
        className="uipilot-spotlight-scrim"
        aria-label="Dismiss guide highlight"
        onClick={onDismiss}
      />
      {hole && (
        <div
          className="uipilot-spotlight-ring"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      )}
      <div
        className="uipilot-spotlight-card"
        style={{
          top: hole ? Math.min(window.innerHeight - 120, hole.top + hole.height + 12) : 24,
          left: hole ? Math.min(window.innerWidth - 320, Math.max(16, hole.left)) : 16,
        }}
      >
        <p style={{ margin: '0 0 0.75rem' }}>{spotlight.message}</p>
        <button type="button" className="uipilot-chat-btn" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
