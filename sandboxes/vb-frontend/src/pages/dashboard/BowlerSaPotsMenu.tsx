import React, { useEffect, useId, useRef, useState } from 'react';
import { formatMoney } from './bowlerFinancialEvents';
import type { BowlerSaPotLine } from './bowlerFinancialEvents';

interface BowlerSaPotsMenuProps {
  label: string;
  amountDisplay: string;
  pots: BowlerSaPotLine[];
  disabled?: boolean;
  title?: string;
  className?: string;
}

/**
 * Click-to-open pot breakdown for Stats Financials SA entered / won cells.
 */
const BowlerSaPotsMenu: React.FC<BowlerSaPotsMenuProps> = ({
  label,
  amountDisplay,
  pots,
  disabled = false,
  title,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (disabled || pots.length === 0) {
    return <span title={title}>{amountDisplay}</span>;
  }

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        className="text-left text-primary hover:text-text-muted underline-offset-2 hover:underline"
        aria-expanded={open}
        aria-controls={menuId}
        title={title ?? `Show ${label} pots`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        {amountDisplay}
      </button>
      {open && (
        <div
          id={menuId}
          role="dialog"
          aria-label={`${label} pots`}
          className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-border bg-surface shadow-lg"
        >
          <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted">
                <th className="px-3 py-1.5 text-left font-medium">Pot</th>
                <th className="px-2 py-1.5 text-right font-medium">Entered</th>
                <th className="px-3 py-1.5 text-right font-medium">Won</th>
              </tr>
            </thead>
            <tbody>
              {pots.map((pot) => (
                <tr key={pot.side_action_id} className="border-t border-border/60">
                  <td className="px-3 py-1.5 text-left text-text">{pot.name}</td>
                  <td className="px-2 py-1.5 text-right text-text-muted">
                    {pot.entries > 0 ? formatMoney(pot.fees) : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right text-text-muted">
                    {pot.winnings > 0 ? formatMoney(pot.winnings) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BowlerSaPotsMenu;
