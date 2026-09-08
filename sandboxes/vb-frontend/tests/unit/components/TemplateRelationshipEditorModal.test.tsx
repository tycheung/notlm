import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import TemplateRelationshipEditorModal from '../../../src/components/eventFormatWizard/TemplateRelationshipEditorModal';
import { AdvancementMethod } from '../../../src/types/roundRelationship';
import { DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE } from '../../../src/types/round_enums';

describe('TemplateRelationshipEditorModal', () => {
  afterEach(() => {
    cleanup();
  });
  it('defaults criteria to total pinfall for new flow arrows', () => {
    render(
      <TemplateRelationshipEditorModal
        isOpen
        onClose={() => {}}
        draft={null}
        roundRefs={['r1', 'r2']}
        roundSpecs={[
          {
            ref: 'r1',
            competition_method: AdvancementMethod.ELIMINATOR,
            competition_method_config: { game_count: 1 },
          },
          {
            ref: 'r2',
            competition_method: AdvancementMethod.ELIMINATOR,
            competition_method_config: { game_count: 1 },
          },
        ]}
        finalRefs={[]}
        isNew
        createMode="round_target"
        onSave={() => {}}
      />
    );

    const criteriaSelect = screen.getAllByRole('combobox').find((el) => {
      const options = Array.from(el.querySelectorAll('option')).map((o) => o.textContent);
      return options.includes('Total Pinfall') && options[0]?.includes('Total Pinfall');
    });
    expect(criteriaSelect).toBeTruthy();
    expect((criteriaSelect as HTMLSelectElement).value).toBe(
      DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE
    );
  });

  it('inherits source competition from round specs (no per-edge method editor)', () => {
    render(
      <TemplateRelationshipEditorModal
        isOpen
        onClose={() => {}}
        draft={null}
        roundRefs={['r1', 'r2']}
        roundSpecs={[
          {
            ref: 'r1',
            friendly_name: 'A',
            competition_method: AdvancementMethod.ELIMINATOR,
            competition_method_config: { game_count: 1 },
          },
          {
            ref: 'r2',
            friendly_name: 'B',
            competition_method: AdvancementMethod.BRACKET,
            competition_method_config: { game_count: 1, bracket_mode: 'single_elimination' },
          },
        ]}
        finalRefs={['f1']}
        isNew
        createMode="round_target"
        onSave={() => {}}
      />
    );

    const hint = screen.getByText(/inherits competition format from the source round/i);
    expect(hint).toBeTruthy();
    expect(hint.textContent?.toLowerCase()).toContain('qualifier');
    expect(screen.queryByText('Bracket mode')).not.toBeInTheDocument();
  });

  it('requires count or percentage for eliminator relationships', () => {
    const onSave = vi.fn();
    render(
      <TemplateRelationshipEditorModal
        isOpen
        onClose={() => {}}
        draft={null}
        roundRefs={['r1', 'r2']}
        roundSpecs={[
          {
            ref: 'r1',
            friendly_name: 'A',
            competition_method: AdvancementMethod.ELIMINATOR,
            competition_method_config: { game_count: 1 },
          },
          {
            ref: 'r2',
            friendly_name: 'B',
            competition_method: AdvancementMethod.ELIMINATOR,
            competition_method_config: { game_count: 1 },
          },
        ]}
        finalRefs={[]}
        isNew
        createMode="round_target"
        onSave={onSave}
      />
    );

    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    fireEvent.click(saveButtons[saveButtons.length - 1]);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/specify either advancement count or advancement percent/i)).toBeTruthy();
  });

  it('saves carry-over enabled state when toggle is enabled', () => {
    const onSave = vi.fn();
    render(
      <TemplateRelationshipEditorModal
        isOpen
        onClose={() => {}}
        draft={{
          source_ref: 'r1',
          target_ref: 'r2',
          advancement_count: 2,
          carry_over_enabled: true,
        }}
        roundRefs={['r1', 'r2', 'r3']}
        roundSpecs={[
          {
            ref: 'r1',
            competition_method: AdvancementMethod.ELIMINATOR,
            competition_method_config: { game_count: 1 },
          },
          {
            ref: 'r2',
            competition_method: AdvancementMethod.ELIMINATOR,
            competition_method_config: { game_count: 1 },
          },
          {
            ref: 'r3',
            competition_method: AdvancementMethod.ELIMINATOR,
            competition_method_config: { game_count: 1 },
          },
        ]}
        finalRefs={[]}
        isNew={false}
        createMode="round_target"
        onSave={onSave}
      />
    );

    const carryToggle = screen.getAllByLabelText(
      'Carry over prior rounds in scoring'
    ).at(-1) as HTMLInputElement;
    expect(carryToggle.checked).toBe(true);
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    fireEvent.click(saveButtons[saveButtons.length - 1]);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].carry_over_enabled).toBe(true);
  });

  it('shows carry-over toggle for round robin source links', () => {
    render(
      <TemplateRelationshipEditorModal
        isOpen
        onClose={() => {}}
        draft={null}
        roundRefs={['r1', 'r2']}
        roundSpecs={[
          {
            ref: 'r1',
            competition_method: AdvancementMethod.ROUND_ROBIN,
            competition_method_config: { game_count: 1 },
          },
          {
            ref: 'r2',
            competition_method: AdvancementMethod.PODS,
            competition_method_config: { game_count: 1 },
          },
        ]}
        finalRefs={[]}
        isNew
        createMode="round_target"
        onSave={() => {}}
      />
    );
    expect(screen.getAllByLabelText('Carry over prior rounds in scoring').length).toBeGreaterThan(0);
  });

  it('hides carry-over toggle for bracket source and clears on save', () => {
    const onSave = vi.fn();
    render(
      <TemplateRelationshipEditorModal
        isOpen
        onClose={() => {}}
        draft={{
          source_ref: 'r1',
          target_ref: 'r2',
          advancement_count: 2,
          carry_over_enabled: true,
        }}
        roundRefs={['r1', 'r2']}
        roundSpecs={[
          {
            ref: 'r1',
            competition_method: AdvancementMethod.BRACKET,
            competition_method_config: {
              game_count: 1,
              bracket_mode: 'single_elimination',
            },
          },
          {
            ref: 'r2',
            competition_method: AdvancementMethod.BRACKET,
            competition_method_config: {
              game_count: 1,
              bracket_mode: 'single_elimination',
            },
          },
        ]}
        finalRefs={[]}
        isNew={false}
        createMode="round_target"
        onSave={onSave}
      />
    );
    expect(screen.queryByLabelText('Carry over prior rounds in scoring')).not.toBeInTheDocument();
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    fireEvent.click(saveButtons[saveButtons.length - 1]);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].carry_over_enabled).toBe(false);
  });

  it('clears carry-over on save for stepladder sources (not UI-supported)', () => {
    const onSave = vi.fn();
    render(
      <TemplateRelationshipEditorModal
        isOpen
        onClose={() => {}}
        draft={{
          source_ref: 'r1',
          target_ref: 'r2',
          advancement_count: 2,
          carry_over_enabled: true,
        }}
        roundRefs={['r1', 'r2']}
        roundSpecs={[
          {
            ref: 'r1',
            competition_method: AdvancementMethod.STEPLADDER,
            competition_method_config: { game_count: 1 },
          },
          {
            ref: 'r2',
            competition_method: AdvancementMethod.STEPLADDER,
            competition_method_config: { game_count: 1 },
          },
        ]}
        finalRefs={[]}
        isNew={false}
        createMode="round_target"
        onSave={onSave}
      />
    );
    expect(screen.queryByLabelText('Carry over prior rounds in scoring')).not.toBeInTheDocument();
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    fireEvent.click(saveButtons[saveButtons.length - 1]);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].carry_over_enabled).toBe(false);
  });
});
