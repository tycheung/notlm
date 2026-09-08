import React, { useMemo, useState } from 'react';
import type { MatchSeriesRead } from '../../../api/round-match-series';
import type { EventTeamRead } from '../../../types/event_team';
import { matchBlockPropsFromDiagramMatch } from '../../match-play-diagram/adapters/bracketSingleElim';
import MatchDiagramShell from '../../match-play-diagram/shared/MatchDiagramShell';
import { COLUMN_WIDTH, CONNECTOR_WIDTH } from '../../match-play-diagram/shared/constants';
import {
  buildEventBracketDiagramModel,
  fieldSizeFromModel,
  stripUnscoredBoxes,
  type EventBracketMode,
} from './eventBracketDiagram';

export type BracketViewerMode = EventBracketMode;

export interface EventBracketViewerProps {
  matchSeries: MatchSeriesRead[];
  isTeamEvent: boolean;
  bracketMode?: BracketViewerMode | null;
  teams?: EventTeamRead[];
  participants?: Array<{ event_participant_id: number; user_name?: string | null }>;
  title?: string;
}

const EventBracketViewer: React.FC<EventBracketViewerProps> = ({
  matchSeries,
  isTeamEvent,
  bracketMode,
  teams,
  participants,
  title,
}) => {
  const isDouble = bracketMode === 'double_elimination';
  const diagramModel = useMemo(
    () =>
      buildEventBracketDiagramModel({
        matchSeries,
        isTeamEvent,
        bracketMode,
        teams,
        participants,
      }),
    [bracketMode, isTeamEvent, matchSeries, participants, teams]
  );

  const sections = diagramModel.sections?.length
    ? diagramModel.sections
    : [{ key: 'main', label: diagramModel.title, columns: diagramModel.columns }];
  const [activeSection, setActiveSection] = useState(sections[0]?.key ?? 'main');
  const active = sections.find((s) => s.key === activeSection) ?? sections[0];
  const fieldSize = fieldSizeFromModel(diagramModel);
  const columnCount = active?.columns.length ?? 0;
  const minWidth = Math.max(
    760,
    columnCount * COLUMN_WIDTH + Math.max(0, columnCount - 1) * CONNECTOR_WIDTH
  );

  if (matchSeries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-text-muted">
        No bracket matches yet. Generate the bracket first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sections.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                active?.key === section.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface-light text-text-muted'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      )}
      <MatchDiagramShell
        title={title || active?.label || diagramModel.title}
        subtitle={
          fieldSize
            ? `${fieldSize}-team ${isDouble ? 'double' : 'single'} elimination`
            : diagramModel.subtitle
        }
        minWidth={minWidth}
        columns={(active?.columns ?? []).map((col) => ({
          key: col.key,
          header: col.header,
          matches: col.matches.map((raw) => {
            const match = stripUnscoredBoxes(raw);
            return {
              key: match.id,
              ...matchBlockPropsFromDiagramMatch(match),
            };
          }),
        }))}
      />
    </div>
  );
};

export default EventBracketViewer;
