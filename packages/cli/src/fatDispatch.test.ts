import { describe, expect, it } from 'vitest';
import { isUnsupportedCommand, unsupportedCommandMessage } from './fatDispatch.js';

describe('fatDispatch (unsupported surface)', () => {
  it('marks authoring / offline verbs as unsupported', () => {
    expect(isUnsupportedCommand('map')).toBe(true);
    expect(isUnsupportedCommand('tune')).toBe(true);
    expect(isUnsupportedCommand('prepare')).toBe(true);
    expect(isUnsupportedCommand('misses', 'pull')).toBe(true);
    expect(isUnsupportedCommand('exchanges', 'pull')).toBe(true);
    expect(isUnsupportedCommand('exchanges', 'fold')).toBe(true);
    expect(isUnsupportedCommand('metrics')).toBe(true);
    expect(isUnsupportedCommand('scenarios', 'saturate')).toBe(true);
    expect(isUnsupportedCommand('pack', 'author')).toBe(true);
    expect(isUnsupportedCommand('pack', 'accept')).toBe(true);
    expect(isUnsupportedCommand('intents', 'tune')).toBe(true);
    expect(isUnsupportedCommand('ranker', 'train')).toBe(true);
  });

  it('allows thin operating gates', () => {
    expect(isUnsupportedCommand('init')).toBe(false);
    expect(isUnsupportedCommand('validate')).toBe(false);
    expect(isUnsupportedCommand('intents', 'check')).toBe(false);
    expect(isUnsupportedCommand('ranker', 'check')).toBe(false);
    expect(isUnsupportedCommand('pack', 'validate')).toBe(false);
    expect(isUnsupportedCommand(undefined)).toBe(false);
  });

  it('messages without naming external tooling', () => {
    const msg = unsupportedCommandMessage('exchanges');
    expect(msg).toBe('Not available in notlmCLI: exchanges');
    expect(msg.toLowerCase()).not.toContain('training');
    expect(msg.toLowerCase()).not.toContain('trainer');
  });
});
