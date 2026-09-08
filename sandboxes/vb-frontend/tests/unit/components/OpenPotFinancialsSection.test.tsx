import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import OpenPotFinancialsSection from '@/components/side_actions/OpenPotFinancialsSection';

describe('OpenPotFinancialsSection', () => {
  it('surfaces current entries and prize fund in financials', () => {
    render(
      <OpenPotFinancialsSection
        entryFee={10}
        entryCount={12}
        expenseType="flat"
        expenseAmount={5}
        places={[100, 50, 25]}
        onPlacesChange={() => undefined}
      />
    );

    expect(screen.getByText('Current entries: 12')).toBeInTheDocument();
    expect(screen.getByText(/Collected \$120\.00 \(12 × \$10\.00\)/)).toBeInTheDocument();
    expect(screen.getByText(/Prize fund \$115\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Place prizes total \$175\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$60\.00 over prize fund/)).toBeInTheDocument();
  });

  it('uses custom entry count label', () => {
    render(
      <OpenPotFinancialsSection
        entryFee={5}
        entryCount={4}
        entryCountLabel="pair tickets"
        expenseType="flat"
        expenseAmount={0}
        places={[10]}
        onPlacesChange={() => undefined}
      />
    );

    expect(screen.getByText('Current pair tickets: 4')).toBeInTheDocument();
  });
});
