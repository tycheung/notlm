import { describe, expect, it } from 'vitest';

import { formatDirectorIdentity } from '@/utils/directorIdentity';

describe('formatDirectorIdentity', () => {
  it('shows display name with legal name', () => {
    expect(
      formatDirectorIdentity({
        first_name: 'Jane',
        last_name: 'Smith',
        display_name: 'Victory Events',
      })
    ).toBe('Victory Events (Jane Smith)');
  });

  it('falls back to legal name when display name is missing', () => {
    expect(
      formatDirectorIdentity({ first_name: 'Jane', last_name: 'Smith' })
    ).toBe('Jane Smith');
  });

  it('does not hide behind a matching display name', () => {
    expect(
      formatDirectorIdentity({
        first_name: 'Jane',
        last_name: 'Smith',
        display_name: 'jane smith',
      })
    ).toBe('Jane Smith');
  });
});
