import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const srcRoot = path.resolve(__dirname, '../../../src');

describe('phase1 dead-code cleanup', () => {
  it('removes orphaned mock team management components', () => {
    const removed = [
      'components/event/TeamManagementView.tsx',
      'components/event/TeamScorecard.tsx',
      'components/event/TeamStandings.tsx',
      'components/event/TeamPerformanceChart.tsx',
      'components/event/TeamCaptainManagement.tsx',
    ];
    for (const rel of removed) {
      expect(fs.existsSync(path.join(srcRoot, rel))).toBe(false);
    }
  });

  it('removes unused Redux scaffold and empty page dirs', () => {
    expect(fs.existsSync(path.join(srcRoot, 'store'))).toBe(false);
    expect(fs.existsSync(path.join(srcRoot, 'pages/scoring'))).toBe(false);
    expect(fs.existsSync(path.join(srcRoot, 'pages/side_actions'))).toBe(false);
  });

  it('does not ship RoundDetails export/print placeholder dialogs', () => {
    const source = fs.readFileSync(
      path.join(srcRoot, 'pages/rounds/RoundDetails.tsx'),
      'utf8'
    );
    expect(source).not.toMatch(/Export to CSV feature will be implemented/);
    expect(source).not.toMatch(/Print results feature will be implemented/);
    expect(source).not.toMatch(/setPlaceholderMessage/);
    expect(source).not.toMatch(/MessageDialog/);
    expect(source).not.toMatch(/Calculate Advancement/);
  });

  it('removes orphaned layout/nav and nearby stub surfaces', () => {
    const removed = [
      'components/layout/Sidebar.tsx',
      'components/layout/MainMenu.tsx',
      'components/tournament/NearbyTournamentSearch.tsx',
      'pages/tournaments/NearbyTournamentsPage.tsx',
    ];
    for (const rel of removed) {
      expect(fs.existsSync(path.join(srcRoot, rel))).toBe(false);
    }

    const app = fs.readFileSync(path.join(srcRoot, 'App.tsx'), 'utf8');
    expect(app).toMatch(/path="\/tournaments\/nearby"/);
    expect(app).toMatch(/Navigate to="\/tournaments"/);
    expect(app).not.toMatch(/NearbyTournamentsPage/);

    const eventDetails = fs.readFileSync(
      path.join(srcRoot, 'pages/events/EventDetails.tsx'),
      'utf8'
    );
    expect(eventDetails).not.toMatch(/Coming Soon/);
    expect(eventDetails).toMatch(/LaneAssignmentPanel/);

    const tournamentsApi = fs.readFileSync(path.join(srcRoot, 'api/tournaments.ts'), 'utf8');
    expect(tournamentsApi).not.toMatch(/searchTournamentsByAddress/);
    expect(tournamentsApi).not.toMatch(/NEAR_ME/);
  });
});
