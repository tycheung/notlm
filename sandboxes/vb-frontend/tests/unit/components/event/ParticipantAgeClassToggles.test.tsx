import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ParticipantAgeClassToggles from '../../../../src/components/event/ParticipantAgeClassToggles';

afterEach(() => cleanup());

describe('ParticipantAgeClassToggles', () => {
  it('renders Youth, Senior, and Female checkboxes', () => {
    render(
      <ParticipantAgeClassToggles
        isYouth={false}
        isSenior={true}
        isFemale={false}
        onChange={vi.fn()}
        onFemaleChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Youth')).not.toBeChecked();
    expect(screen.getByLabelText('Senior')).toBeChecked();
    expect(screen.getByLabelText('Female')).not.toBeChecked();
  });

  it('calls onFemaleChange when Female is toggled', () => {
    const onFemaleChange = vi.fn();
    const { getByLabelText } = render(
      <ParticipantAgeClassToggles
        isYouth={false}
        isSenior={false}
        isFemale={false}
        onChange={vi.fn()}
        onFemaleChange={onFemaleChange}
      />
    );

    fireEvent.click(getByLabelText('Female'));
    expect(onFemaleChange).toHaveBeenCalledWith(true);
  });
});
