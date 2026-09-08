import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Tabs from '@/components/common/Tabs';

describe('Tabs', () => {
  it('supports roving focus and WAI-ARIA keyboard selection', () => {
    const onChange = vi.fn();
    render(
      <Tabs
        activeTab="one"
        ariaLabel="Example sections"
        tabs={[
          { id: 'one', label: 'One' },
          { id: 'disabled', label: 'Disabled', disabled: true },
          { id: 'three', label: 'Three' },
        ]}
        onTabChange={onChange}
      />
    );

    const one = screen.getByRole('tab', { name: 'One' });
    const three = screen.getByRole('tab', { name: 'Three' });
    expect(screen.getByRole('tablist', { name: 'Example sections' })).toBeInTheDocument();
    expect(one).toHaveAttribute('aria-selected', 'true');
    expect(one).toHaveAttribute('tabindex', '0');
    expect(three).toHaveAttribute('tabindex', '-1');

    one.focus();
    fireEvent.keyDown(one, { key: 'ArrowRight' });
    expect(three).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('three');

    fireEvent.keyDown(three, { key: 'Home' });
    expect(one).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('one');
  });
});
