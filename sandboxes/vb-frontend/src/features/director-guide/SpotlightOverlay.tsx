import React, { useEffect, useLayoutEffect, useState } from 'react';
import type { SpotlightState } from './useSpotlightController';

type Props = {
  spotlight: SpotlightState;
  onDismiss: () => void;
};

/**
 * Dim overlay with a hole around `[data-guide-id=…]` and coach copy.
 */
const SpotlightOverlay: React.FC<Props> = ({ spotlight, onDismiss }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!spotlight) {
      setRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector(`[data-guide-id="${spotlight.guideId}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [spotlight]);

  useEffect(() => {
    if (!spotlight) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spotlight, onDismiss]);

  if (!spotlight) return null;

  const pad = 8;
  const r = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-label="Guided highlight">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default"
        aria-label="Dismiss guide highlight"
        onClick={onDismiss}
      />
      {r && (
        <div
          className="pointer-events-none absolute rounded-md ring-4 ring-primary ring-offset-2 ring-offset-transparent animate-pulse"
          style={{
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          }}
        />
      )}
      <div
        className="absolute z-[81] max-w-sm rounded-lg border border-border bg-surface p-4 shadow-lg"
        style={{
          top: r ? Math.min(window.innerHeight - 120, r.top + r.height + 12) : 24,
          left: r ? Math.min(window.innerWidth - 320, Math.max(16, r.left)) : 16,
        }}
      >
        <p className="text-sm text-text mb-3">{spotlight.message}</p>
        <button
          type="button"
          className="text-sm font-semibold text-primary hover:underline"
          onClick={onDismiss}
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default SpotlightOverlay;
