import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const srcRoot = path.resolve(__dirname, '../../../src');

describe('phase3 complexity reduction', () => {
  it('defines director/admin shared routes once', () => {
    const roleScoped = fs.readFileSync(
      path.join(srcRoot, 'routes/roleScopedRoutes.tsx'),
      'utf8'
    );
    const app = fs.readFileSync(path.join(srcRoot, 'App.tsx'), 'utf8');
    expect(roleScoped).toMatch(/renderRoleScopedRoutes/);
    expect(app).toMatch(/renderRoleScopedRoutes\('director'\)/);
    expect(app).toMatch(/renderRoleScopedRoutes\('admin'\)/);
    expect(app).not.toMatch(/path="\/director\/events\/:id"/);
    expect(app).not.toMatch(/path="\/admin\/events\/:id"/);
  });

  it('does not expose unused FE API methods', () => {
    const rounds = fs.readFileSync(path.join(srcRoot, 'api/rounds.ts'), 'utf8');
    const tournaments = fs.readFileSync(path.join(srcRoot, 'api/tournaments.ts'), 'utf8');
    const sideActions = fs.readFileSync(path.join(srcRoot, 'api/side-actions.ts'), 'utf8');
    expect(rounds).not.toMatch(/processAdvancement/);
    expect(rounds).not.toMatch(/resetRoundAdvancementPool/);
    expect(tournaments).not.toMatch(/getTimezoneForLocation/);
    expect(sideActions).toMatch(/deleteSideAction/);
  });
});
