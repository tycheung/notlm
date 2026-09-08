import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const srcRoot = path.resolve(__dirname, '../../../src');

describe('phase2 wiring fixes', () => {
  it('removes RoundDetails Calculate Advancement stub route', () => {
    const source = fs.readFileSync(
      path.join(srcRoot, 'pages/rounds/RoundDetails.tsx'),
      'utf8'
    );
    expect(source).not.toMatch(/Calculate Advancement/);
    expect(source).not.toMatch(/\/advancement/);
    expect(source).not.toMatch(/RESULTS/);
  });

  it('wires RoundsManagement squad click/edit to role-aware paths', () => {
    const source = fs.readFileSync(
      path.join(srcRoot, 'pages/rounds/RoundsManagement.tsx'),
      'utf8'
    );
    expect(source).toMatch(/getSquadPath\(squadId\)/);
    expect(source).toMatch(/getSquadPath\(squadId, '\/edit'\)/);
    expect(source).not.toMatch(/Navigate to squad details - this will be handled/);
  });
});
