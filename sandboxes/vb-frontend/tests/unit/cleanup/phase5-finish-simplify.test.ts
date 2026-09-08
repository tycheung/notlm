import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const srcRoot = path.resolve(__dirname, '../../../src');

describe('phase5 finish-and-simplify gates', () => {
  it('shows Lane Assignments tab when canLanes is true', () => {
    const tabs = fs.readFileSync(
      path.join(srcRoot, 'pages/events/eventDetailsTabs.ts'),
      'utf8'
    );
    expect(tabs).toMatch(/LANE_ASSIGNMENT/);
    expect(tabs).toMatch(/Lane Assignments/);
    expect(tabs).not.toMatch(/Lane assignment UI is deferred/);
  });

  it('does not ship dead /tutorials or /contact routes or footer links', () => {
    const app = fs.readFileSync(path.join(srcRoot, 'App.tsx'), 'utf8');
    expect(app).not.toMatch(/path="\/tutorials"/);
    expect(app).not.toMatch(/path="\/contact"/);

    const footer = fs.readFileSync(
      path.join(srcRoot, 'components/layout/Footer.tsx'),
      'utf8'
    );
    expect(footer).not.toMatch(/to="\/tutorials"/);
    expect(footer).not.toMatch(/to="\/contact"/);
    expect(footer).toMatch(/mailto:support@victorybowling\.com/);
  });

  it('does not call retired side-action process/prize endpoints', () => {
    const walk = (dir: string, acc: string[] = []) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p, acc);
        else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p);
      }
      return acc;
    };
    for (const file of walk(srcRoot)) {
      const text = fs.readFileSync(file, 'utf8');
      expect(text).not.toMatch(/side-actions\/\$\{[^}]+\}\/process/);
      expect(text).not.toMatch(/\/calculate-winners/);
      expect(text).not.toMatch(/\/assign-prizes/);
      expect(text).not.toMatch(/\/process-cuts/);
    }
  });

  it('removes address-geocode bowling-center client wrappers', () => {
    const api = fs.readFileSync(path.join(srcRoot, 'api/bowling-centers.ts'), 'utf8');
    expect(api).not.toMatch(/BY_ADDRESS/);
    expect(api).not.toMatch(/UPDATE_COORDINATES/);
    expect(api).not.toMatch(/searchCentersByAddress/);
    expect(api).not.toMatch(/updateCenterCoordinates/);
    expect(api).toMatch(/NEAR_ME/);
  });

  it('wires 2FA login completion into AuthContext', () => {
    const auth = fs.readFileSync(path.join(srcRoot, 'contexts/AuthContext.tsx'), 'utf8');
    expect(auth).toMatch(/completeTwoFactorLogin/);
    expect(auth).toMatch(/requires_2fa/);
    expect(auth).toMatch(/verifyTwoFactorLogin/);
  });

  it('ships lane grid, score-sheet client, and no dead movement-preview API', () => {
    const lanesApi = fs.readFileSync(path.join(srcRoot, 'features/lanes/api.ts'), 'utf8');
    expect(lanesApi).toMatch(/stampGames/);
    expect(lanesApi).toMatch(/getScoreSheet/);
    expect(lanesApi).not.toMatch(/previewMovement/);

    const panel = fs.readFileSync(
      path.join(srcRoot, 'components/event-lane/LaneAssignmentPanel.tsx'),
      'utf8'
    );
    expect(panel).toMatch(/LaneBoardGrid/);

    const workspace = fs.readFileSync(
      path.join(srcRoot, 'components/event-round/EventRoundWorkspace.tsx'),
      'utf8'
    );
    expect(workspace).toMatch(/useLaneScoreSheet/);
    expect(workspace).toMatch(/laneLabelLookup/);
  });
});
