import { describe, expect, it } from 'vitest';

import { buildStandingsQrPosterDocument } from '@/components/event-reports/buildStandingsQrPosterDocument';

describe('buildStandingsQrPosterDocument', () => {
  it('prints tournament info, Find standings here, and a QR for the live URL', () => {
    const doc = buildStandingsQrPosterDocument({
      tournamentName: 'Leading Lady',
      eventName: 'Trios',
      centerName: 'Sunset Lanes',
      dateLabel: 'Aug 1 – Aug 2, 2026',
      standingsUrl: 'https://app.victorybowling.com/tournaments/9?tab=live&eventId=6',
    });

    expect(doc.title).toBe('Standings QR poster');
    expect(doc.html).toContain('Leading Lady');
    expect(doc.html).toContain('Trios');
    expect(doc.html).toContain('Sunset Lanes');
    expect(doc.html).toContain('Find standings here');
    expect(doc.html).toContain('https://app.victorybowling.com/tournaments/9?tab=live&amp;eventId=6');
    expect(doc.html).toContain('<svg');
    expect(doc.html).toContain('@page { size: letter portrait');
  });
});
