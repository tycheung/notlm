import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EventShareModal from '@/components/event/EventShareModal';

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr">{value}</div>,
}));

vi.mock('@/components/common/Modal', () => ({
  default: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title?: string;
    children: React.ReactNode;
  }) => (isOpen ? <div><h2>{title}</h2>{children}</div> : null),
}));

vi.mock('@/components/side_actions/reports/SideActionReportPreviewModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="poster-preview" /> : null,
}));

vi.mock('@/utils/appUrl', () => ({
  tournamentPublicLandingUrl: (id: number) => `https://app.example/tournaments/${id}`,
  tournamentPublicStandingsUrl: (id: number, eventId?: number | null) =>
    `https://app.example/tournaments/${id}?tab=live&eventId=${eventId}`,
}));

afterEach(cleanup);

describe('EventShareModal', () => {
  it('shows a landing-page QR and a print standings poster control', () => {
    render(
      <EventShareModal
        isOpen
        onClose={() => undefined}
        eventId={6}
        tournamentId={9}
        eventName="Trios"
        tournamentName="Leading Lady"
      />
    );

    expect(screen.getByDisplayValue('https://app.example/tournaments/9')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('https://app.example/tournaments/9?tab=live&eventId=6')
    ).toBeInTheDocument();
    expect(screen.getByTestId('qr')).toHaveTextContent(
      'https://app.example/tournaments/9'
    );
    expect(screen.getByRole('button', { name: 'Print standings poster' })).toBeInTheDocument();
  });
});
