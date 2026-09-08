import { editDistance } from '@uipilot/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUiPilot } from './UiPilotContext.js';

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function searchSteps(query: string, statuses: ReturnType<typeof useUiPilot>['statuses']) {
  const q = normalize(query);
  if (!q) return statuses;
  return statuses
    .map((status) => {
      const hay = normalize(status.title);
      if (hay.includes(q)) return { status, score: q.length + 100 };
      const dist = editDistance(q, hay);
      const threshold = Math.max(2, Math.floor(hay.length * 0.4));
      return dist <= threshold ? { status, score: hay.length - dist } : null;
    })
    .filter((row): row is { status: (typeof statuses)[number]; score: number } => row != null)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.status);
}

export function CommandPalette() {
  const {
    paletteOpen,
    setPaletteOpen,
    executeStep,
    statuses,
    hostRootStyle,
    hostRootClassName,
    chrome,
  } = useUiPilot();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const classNames = chrome.classNames;

  const results = useMemo(() => searchSteps(query, statuses), [query, statuses]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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
    if (!item || !item.available) return;
    setPaletteOpen(false);
    executeStep(item.id);
  };

  return (
    <div
      className={[hostRootClassName, 'uipilot-palette-backdrop', classNames?.paletteBackdrop]
        .filter(Boolean)
        .join(' ')}
      style={hostRootStyle}
      data-testid="uipilot-command-palette"
    >
      <button
        type="button"
        className="uipilot-palette-scrim"
        aria-label="Close command palette"
        onClick={() => setPaletteOpen(false)}
      />
      <div
        className={['uipilot-palette-panel', classNames?.palettePanel].filter(Boolean).join(' ')}
        role="dialog"
        aria-label="Workflow command palette"
      >
        <input
          ref={inputRef}
          className="uipilot-palette-input"
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
          placeholder="Jump to a step…"
          aria-label="Search workflow steps"
        />
        <ul className="uipilot-palette-list" role="listbox">
          {results.length === 0 && (
            <li className="uipilot-palette-item" aria-disabled="true">
              No matching steps
            </li>
          )}
          {results.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                disabled={!item.available}
                className={`uipilot-palette-item ${index === activeIndex ? 'uipilot-palette-item-active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => run(index)}
              >
                <span>{item.title}</span>
                {item.complete && <span> · Done</span>}
                {!item.available && item.blockedReason && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.blockedReason}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
