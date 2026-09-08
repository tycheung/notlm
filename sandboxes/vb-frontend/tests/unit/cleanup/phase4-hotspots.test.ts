import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const srcRoot = path.join(root, 'src');

describe('phase4 hotspot shrink', () => {
  it('no longer depends on heroicons', { timeout: 30_000 }, () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.dependencies?.['@heroicons/react']).toBeUndefined();

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
      expect(text).not.toMatch(/@heroicons\/react/);
    }
  });

  it('extracts EventDetails tab helpers and axios http utils', () => {
    expect(fs.existsSync(path.join(srcRoot, 'pages/events/eventDetailsTabs.ts'))).toBe(true);
    expect(fs.existsSync(path.join(srcRoot, 'api/httpUtils.ts'))).toBe(true);

    const eventDetails = fs.readFileSync(
      path.join(srcRoot, 'pages/events/EventDetails.tsx'),
      'utf8'
    );
    expect(eventDetails).toMatch(/from '\.\/eventDetailsTabs'/);
    expect(eventDetails).toMatch(/export \{[\s\S]*TabType[\s\S]*\} from '\.\/eventDetailsTabs'/);

    const axiosSource = fs.readFileSync(path.join(srcRoot, 'api/axios.ts'), 'utf8');
    expect(axiosSource).toMatch(/from '\.\/httpUtils'/);
    expect(axiosSource).not.toMatch(/const needsTrailingSlash/);
  });

  it('removes ConnectedAccounts stub surface from the account area', () => {
    expect(
      fs.existsSync(path.join(srcRoot, 'components/account/ConnectedAccounts.tsx'))
    ).toBe(false);
    const accountPage = fs.readFileSync(
      path.join(srcRoot, 'pages/user/AccountPage.tsx'),
      'utf8'
    );
    expect(accountPage).not.toMatch(/ConnectedAccounts/);
    expect(accountPage).not.toMatch(/tab="connected"/);
  });
});
