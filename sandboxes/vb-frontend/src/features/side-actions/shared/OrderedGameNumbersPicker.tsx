import React, { useMemo } from 'react';

interface OrderedGameNumbersPickerProps {
  selectedGameNumbers: number[];
  eventGameCount: number;
  onChange: (gameNumbers: number[]) => void;
  label?: string;
  disabled?: boolean;
}

const OrderedGameNumbersPicker: React.FC<OrderedGameNumbersPickerProps> = ({
  selectedGameNumbers,
  eventGameCount,
  onChange,
  label = 'Games',
  disabled = false,
}) => {
  const totalGames = Math.max(1, Math.trunc(eventGameCount) || 1);
  const allGameNumbers = useMemo(
    () => Array.from({ length: totalGames }, (_, index) => index + 1),
    [totalGames]
  );
  const selected = new Set(selectedGameNumbers);
  const selectedInRange = allGameNumbers.filter((gameNumber) => selected.has(gameNumber));
  const allSelected = selectedInRange.length === totalGames;
  const someSelected = selectedInRange.length > 0 && !allSelected;

  const toggleGame = (gameNumber: number) => {
    const next = new Set(selected);
    if (next.has(gameNumber)) {
      next.delete(gameNumber);
    } else {
      next.add(gameNumber);
    }
    onChange([...next].sort((left, right) => left - right));
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
      return;
    }
    onChange([...allGameNumbers]);
  };

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold text-text">{label}</legend>
      <label className="mb-2 inline-flex cursor-pointer items-center gap-2 rounded border border-border px-3 py-2 text-sm font-medium text-text">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleAll}
        />
        All ({totalGames})
      </label>
      <div className="flex flex-wrap gap-2">
        {allGameNumbers.map((gameNumber) => (
          <label
            key={gameNumber}
            className="inline-flex cursor-pointer items-center gap-2 rounded border border-border px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.has(gameNumber)}
              onChange={() => toggleGame(gameNumber)}
            />
            Game {gameNumber}
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Stage order: {selectedGameNumbers.length ? selectedGameNumbers.join(', ') : 'none'}
      </p>
    </fieldset>
  );
};

export default OrderedGameNumbersPicker;
