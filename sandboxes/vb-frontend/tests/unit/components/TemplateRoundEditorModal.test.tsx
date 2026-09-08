import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import TemplateRoundEditorModal from '../../../src/components/eventFormatWizard/TemplateRoundEditorModal';
import { DEFAULT_ROUND_FORMAT_NAME } from '../../../src/constants/roundFormatDefaults';
import { AdvancementMethod } from '../../../src/types/roundRelationship';

describe('TemplateRoundEditorModal', () => {
  afterEach(cleanup);

  it('labels an eliminator format as qualifier when the round leads to another round', () => {
    render(
      <TemplateRoundEditorModal
        isOpen
        onClose={() => {}}
        draft={{
          ref: 'qualifying',
          competition_method: AdvancementMethod.ELIMINATOR,
        }}
        relationships={[
          { source_ref: 'qualifying', target_ref: 'final' },
        ]}
        isNew={false}
        onSave={() => {}}
      />
    );

    expect(screen.getByRole('option', { name: 'Qualifier' })).toHaveValue(
      AdvancementMethod.ELIMINATOR
    );
    expect(screen.queryByRole('option', { name: 'Eliminator' })).not.toBeInTheDocument();
  });

  it('keeps the eliminator label when the round only leads to a final node', () => {
    render(
      <TemplateRoundEditorModal
        isOpen
        onClose={() => {}}
        draft={{
          ref: 'final',
          competition_method: AdvancementMethod.ELIMINATOR,
        }}
        relationships={[
          { source_ref: 'final', target_final_ref: 'championship' },
        ]}
        isNew={false}
        onSave={() => {}}
      />
    );

    expect(screen.getByRole('option', { name: 'Eliminator' })).toHaveValue(
      AdvancementMethod.ELIMINATOR
    );
  });

  it('shows double-elim grand final reset option for brackets', () => {
    render(
      <TemplateRoundEditorModal
        isOpen
        onClose={() => {}}
        draft={{
          ref: 'r1',
          round_number: 1,
          friendly_name: 'Bracket Round',
          game_count: 3,
          competition_method: AdvancementMethod.BRACKET,
          competition_method_config: {
            bracket_mode: 'double_elimination',
            grand_final_reset: false,
          },
        }}
        isNew={false}
        onSave={() => {}}
      />
    );

    expect(screen.getByText('Grand final reset')).toBeTruthy();
    expect(screen.queryByText('Bye criteria')).toBeNull();
  });

  it('shows stepladder round editor without lane strategy', () => {
    const onSave = vi.fn();
    render(
      <TemplateRoundEditorModal
        isOpen
        onClose={() => {}}
        draft={{
          ref: 'r1',
          round_number: 1,
          friendly_name: 'Ladder',
          game_count: 2,
          competition_method: AdvancementMethod.STEPLADDER,
          competition_method_config: { game_count: 2 },
        }}
        isNew={false}
        onSave={onSave}
      />
    );

    const nameInput = screen.getByDisplayValue('Ladder');
    const dialog = nameInput.closest('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(within(dialog as HTMLElement).queryByText('Lane strategy')).not.toBeInTheDocument();
    expect(within(dialog as HTMLElement).queryByText('Placement resolution')).not.toBeInTheDocument();
    expect(within(dialog as HTMLElement).getByDisplayValue('2')).toHaveAttribute('type', 'number');
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.competition_method).toBe(AdvancementMethod.STEPLADDER);
    expect(payload.game_count).toBe(2);
  });

  it('switches an eliminator round to match-play scoring with bracket', () => {
    const onSave = vi.fn();
    render(
      <TemplateRoundEditorModal
        isOpen
        onClose={() => {}}
        draft={{
          ref: 'final',
          round_number: 2,
          game_count: 3,
          round_format_name: DEFAULT_ROUND_FORMAT_NAME,
          competition_method: AdvancementMethod.ELIMINATOR,
        }}
        isNew={false}
        onSave={onSave}
      />
    );

    const methodSelect = screen
      .getAllByRole('combobox')
      .find((el) => (el as HTMLSelectElement).value === AdvancementMethod.ELIMINATOR);
    expect(methodSelect).toBeTruthy();
    fireEvent.change(methodSelect!, {
      target: { value: AdvancementMethod.BRACKET },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const payload = onSave.mock.calls[0][0];
    expect(payload.competition_method).toBe(AdvancementMethod.BRACKET);
    expect(payload.score_type).toBe('match_play');
    expect(payload.race_to_wins).toBe(2);
    expect(payload.max_games).toBe(3);
    expect(payload.round_format_name).toBeUndefined();
  });

  it('clears match-play fields when switching back to eliminator', () => {
    const onSave = vi.fn();
    render(
      <TemplateRoundEditorModal
        isOpen
        onClose={() => {}}
        draft={{
          ref: 'final',
          round_number: 2,
          game_count: 3,
          score_type: 'match_play',
          race_to_wins: 2,
          max_games: 3,
          competition_method: AdvancementMethod.BRACKET,
        }}
        isNew={false}
        onSave={onSave}
      />
    );

    const competitionFormat = screen
      .getAllByRole('combobox')
      .find((element) => (element as HTMLSelectElement).value === AdvancementMethod.BRACKET);
    expect(competitionFormat).toBeTruthy();
    fireEvent.change(competitionFormat as HTMLSelectElement, {
      target: { value: AdvancementMethod.ELIMINATOR },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const payload = onSave.mock.calls[0][0];
    expect(payload.competition_method).toBe(AdvancementMethod.ELIMINATOR);
    expect(payload.score_type).toBeUndefined();
    expect(payload.race_to_wins).toBeUndefined();
    expect(payload.max_games).toBeUndefined();
    expect(payload.round_format_name).toBe(DEFAULT_ROUND_FORMAT_NAME);
  });
});
