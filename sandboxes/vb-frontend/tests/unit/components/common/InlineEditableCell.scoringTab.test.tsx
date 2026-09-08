import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import InlineEditableCell from '../../../../src/components/common/InlineEditableCell';
import {
  ScoringTabOrderProvider,
  useScoringTabOrder,
} from '../../../../src/contexts/ScoringTabOrderContext';

afterEach(() => cleanup());

function OrderRegistrar({ ids }: { ids: string[] }) {
  const ctx = useScoringTabOrder();
  useEffect(() => {
    ctx?.setOrderedCellIds(ids);
  }, [ctx, ids]);
  return null;
}

function TwoCellHarness() {
  const [a, setA] = useState<string | number | null>(200);
  const [b, setB] = useState<string | number | null>(null);
  const ids = ['cell-a', 'cell-b'];

  return (
    <ScoringTabOrderProvider tabMode="horizontal">
      <OrderRegistrar ids={ids} />
      <InlineEditableCell
        type="number"
        value={a}
        pendingValue={a}
        batchMode
        onChange={setA}
        scoringTabCellId="cell-a"
        enableScoringTabNavigation
        min={0}
        max={300}
      />
      <InlineEditableCell
        type="number"
        value={b}
        pendingValue={b}
        batchMode
        onChange={setB}
        scoringTabCellId="cell-b"
        enableScoringTabNavigation
        min={0}
        max={300}
      />
    </ScoringTabOrderProvider>
  );
}

describe('InlineEditableCell scoring Tab navigation', () => {
  it('focuses the next cell synchronously so the first digit after Tab is kept', () => {
    render(<TwoCellHarness />);

    fireEvent.click(screen.getByText('200'));
    const firstInput = screen.getByDisplayValue('200');
    fireEvent.change(firstInput, { target: { value: '210' } });

    fireEvent.keyDown(firstInput, { key: 'Tab' });

    const secondInput = document.activeElement as HTMLInputElement;
    expect(secondInput?.tagName).toBe('INPUT');

    fireEvent.change(secondInput, { target: { value: '1' } });
    fireEvent.change(secondInput, { target: { value: '16' } });
    fireEvent.change(secondInput, { target: { value: '167' } });

    expect(secondInput.value).toBe('167');
  });

  it('does not double-fire onChange via blur after Tab commit', () => {
    const onA = vi.fn();
    const onB = vi.fn();

    function Harness() {
      const ids = ['cell-a', 'cell-b'];
      return (
        <ScoringTabOrderProvider tabMode="horizontal">
          <OrderRegistrar ids={ids} />
          <InlineEditableCell
            type="number"
            value={200}
            pendingValue={200}
            batchMode
            onChange={onA}
            scoringTabCellId="cell-a"
            enableScoringTabNavigation
            min={0}
            max={300}
          />
          <InlineEditableCell
            type="number"
            value={null}
            pendingValue={null}
            batchMode
            onChange={onB}
            scoringTabCellId="cell-b"
            enableScoringTabNavigation
            min={0}
            max={300}
          />
        </ScoringTabOrderProvider>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByText('200'));
    const firstInput = screen.getByDisplayValue('200');
    fireEvent.change(firstInput, { target: { value: '210' } });
    fireEvent.keyDown(firstInput, { key: 'Tab' });
    // Unmount/blur of previous input must not commit again.
    fireEvent.blur(firstInput);

    expect(onA).toHaveBeenCalledTimes(1);
    expect(onA).toHaveBeenCalledWith(210);
  });
});
