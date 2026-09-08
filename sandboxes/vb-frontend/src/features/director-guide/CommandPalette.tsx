import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDirectorGuide } from './GuideProvider';
import { searchNavSkips } from './navSkipRegistry';

/**
 * Ctrl/Cmd+K command palette over the shared nav-skip registry.
 */
const CommandPalette: React.FC = () => {
  const { ctx, paletteOpen, setPaletteOpen, executeStep } = useDirectorGuide();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchNavSkips(query, ctx), [query, ctx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isPalette = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isPalette) {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, setPaletteOpen]);

  useEffect(() => {
    if (!paletteOpen) return;
    setQuery('');
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [paletteOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!paletteOpen) return null;

  const run = (index: number) => {
    const item = results[index];
    if (!item) return;
    const available = item.isAvailable(ctx);
    if (!available) return;
    setPaletteOpen(false);
    executeStep(item.id);
  };

  return (
    <div className="fixed inset-0 z-[11050] flex items-start justify-center pt-[12vh] px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close command palette"
        onClick={() => setPaletteOpen(false)}
      />
      <div
        className="relative w-full max-w-lg rounded-lg border border-border bg-surface shadow-xl overflow-hidden"
        role="dialog"
        aria-label="Director command palette"
      >
        <div className="border-b border-border px-3 py-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setPaletteOpen(false);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                run(activeIndex);
              }
            }}
            placeholder="Jump to a step… (Create Tournament, Participants, Scores…)"
            className="w-full bg-transparent text-text outline-none text-sm py-2"
            aria-label="Search director steps"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
          {results.length === 0 && (
            <li className="px-3 py-3 text-sm text-text-muted">No matching steps</li>
          )}
          {results.map((item, index) => {
            const available = item.isAvailable(ctx);
            const reason = item.unavailableReason(ctx);
            const complete = item.isComplete(ctx);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  disabled={!available}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    index === activeIndex ? 'bg-surface-light' : ''
                  } ${available ? 'text-text hover:bg-surface-light' : 'text-text-muted opacity-70 cursor-not-allowed'}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => run(index)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    {complete && (
                      <span className="text-xs text-success">Done</span>
                    )}
                  </div>
                  {!available && reason && (
                    <div className="text-xs text-text-muted mt-0.5">{reason}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-border px-3 py-1.5 text-xs text-text-muted">
          Ctrl/Cmd+K · Enter to open · Esc to close
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
