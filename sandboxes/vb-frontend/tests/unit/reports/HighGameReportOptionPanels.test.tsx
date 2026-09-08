import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HighGameReportOptions } from '@/components/side_actions/reports/HighGameReportOptionPanels';

describe('HighGameReportOptions', () => {
  it('keeps Preview disabled until options belong to the selected pool', () => {
    const props = {
      availableGames: [2, 3],
      selectedGames: [2, 3],
      onSelectedGamesChange: vi.fn(),
      payoutMode: 'combined' as const,
      listMode: 'winners' as const,
      onListModeChange: vi.fn(),
      busy: false,
      onBack: vi.fn(),
      onPreview: vi.fn(),
    };
    const { rerender } = render(<HighGameReportOptions {...props} optionsLoaded={false} />);

    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
    rerender(<HighGameReportOptions {...props} optionsLoaded />);
    expect(screen.getByRole('button', { name: 'Preview' })).toBeEnabled();
  });
});
