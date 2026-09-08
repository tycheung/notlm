import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EligibilityConfigSection from '@/components/side_actions/EligibilityConfigSection';
import { DEFAULT_AGE_CLASSES, DEFAULT_DIVISIONS } from '@/components/side_actions/eligibilityConfig';

afterEach(cleanup);

describe('EligibilityConfigSection', () => {
  it('toggles women-only and senior-only restrictions', () => {
    const onDivisionsChange = vi.fn();
    const onAgeClassesChange = vi.fn();
    render(
      <EligibilityConfigSection
        divisions={{ ...DEFAULT_DIVISIONS }}
        ageClasses={{ ...DEFAULT_AGE_CLASSES }}
        onDivisionsChange={onDivisionsChange}
        onAgeClassesChange={onAgeClassesChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Men'));
    expect(onDivisionsChange).toHaveBeenCalledWith({ men: false, women: true });

    fireEvent.click(screen.getByLabelText('Youth'));
    expect(onAgeClassesChange).toHaveBeenCalledWith({
      youth: false,
      open: true,
      senior: true,
    });

    fireEvent.click(screen.getByLabelText('Open adults'));
    expect(onAgeClassesChange).toHaveBeenCalledWith({
      youth: true,
      open: false,
      senior: true,
    });
    expect(screen.getByText(/checked groups can enter \(OR\)/i)).toBeInTheDocument();
  });

  it('mentions teammates must match when this is a team pot', () => {
    render(
      <EligibilityConfigSection
        divisions={{ ...DEFAULT_DIVISIONS }}
        ageClasses={{ ...DEFAULT_AGE_CLASSES }}
        onDivisionsChange={vi.fn()}
        onAgeClassesChange={vi.fn()}
        teamPot
      />
    );
    expect(
      screen.getByText(/every rostered teammate must match/i)
    ).toBeInTheDocument();
  });
});
