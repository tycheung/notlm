import React, { useMemo } from 'react';
import Alert from '../common/Alert';
import EliminatorScoringSurface from './EliminatorScoringSurface';
import type { FormatScoringSurfaceProps } from './types';
import { buildPodsScoringCategories } from '../../utils/podsScoringGroups';

const PodsPinfallScoringSurface: React.FC<FormatScoringSurfaceProps> = (props) => {
  const podCategories = useMemo(
    () =>
      buildPodsScoringCategories({
        squadCategories: props.squadCategories,
        roundParticipants: props.roundParticipants as Record<string, unknown>[],
        podMembership: props.podMembership,
        advanceBySize: props.advanceBySize,
        isTeamEvent: props.isTeamEvent,
      }),
    [
      props.squadCategories,
      props.roundParticipants,
      props.podMembership,
      props.advanceBySize,
      props.isTeamEvent,
    ]
  );

  const totalPodParticipants = useMemo(
    () => podCategories.reduce((sum, pod) => sum + pod.participants.length, 0),
    [podCategories]
  );

  const expandedCategories = useMemo(() => {
    const next: Record<string, boolean> = { ...props.expandedCategories };
    for (const pod of podCategories) {
      if (next[pod.id] === undefined) next[pod.id] = true;
    }
    return next;
  }, [props.expandedCategories, podCategories]);

  if (podCategories.length === 0 || totalPodParticipants === 0) {
    const hasMembership = (props.podMembership?.filter((pod) => pod?.length) ?? []).length > 0;
    const squadHasPeople = props.squadCategories.some(
      (c) => c.id !== 'unassigned' && (c.participants?.length ?? 0) > 0
    );
    const message = hasMembership && !squadHasPeople
      ? 'Pod groups are configured but no advancers are assigned to a squad yet. On the Squads tab, move pool advancers into a squad, lock it, then Generate pods again on Format Editor.'
      : hasMembership && squadHasPeople
        ? 'Pod rosters could not be matched to squad assignments (membership may be from an earlier roster size). Regenerate pods on the Format Editor tab after the squad is locked.'
        : 'No pod rosters yet. Assign advancers on the Squads tab, lock the squad, then generate pods on the Format Editor tab.';
    return <Alert variant="info" message={message} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Each pod bowls together — enter one score per person (or team) per game. Top finishers
        within each pod advance by pinfall; this is not head-to-head match play.
      </p>
      <EliminatorScoringSurface
        {...props}
        squadCategories={podCategories}
        expandedCategories={expandedCategories}
      />
    </div>
  );
};

export default PodsPinfallScoringSurface;
