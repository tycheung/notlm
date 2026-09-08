import React from 'react';
import type { PodsMembershipPreviewPod } from '../../../utils/podsScoringGroups';

interface PodsMembershipPreviewProps {
  pods: PodsMembershipPreviewPod[];
  unitLabel: string;
}

const PodsMembershipPreview: React.FC<PodsMembershipPreviewProps> = ({ pods, unitLabel }) => {
  if (!pods.length) return null;

  const resolvedCount = pods.reduce(
    (sum, pod) => sum + pod.members.filter((m) => m.resolved).length,
    0
  );
  const totalSeeds = pods.reduce((sum, pod) => sum + pod.seeds.length, 0);

  return (
    <div className="space-y-4">
      {resolvedCount < totalSeeds ? (
        <p className="text-xs text-text-muted">
          Showing seed numbers for {totalSeeds - resolvedCount} entrant
          {totalSeeds - resolvedCount === 1 ? '' : 's'} not yet matched to the locked squad
          roster.
        </p>
      ) : null}
      {pods.map((pod) => (
        <div
          key={`pod-preview-${pod.podIndex}`}
          className="rounded-lg border border-border/70 bg-surface p-3"
        >
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Pod {pod.podIndex + 1}
            <span className="ml-2 font-normal normal-case tracking-normal text-text-muted">
              {pod.seeds.length} {unitLabel}
              {pod.seeds.length === 1 ? '' : 's'} · simultaneous pinfall · top {pod.advanceCount}{' '}
              advance
            </span>
          </h4>
          <ul className="space-y-1.5">
            {pod.members.map((member) => (
              <li
                key={`pod-${pod.podIndex}-seed-${member.seed}`}
                className="flex items-center gap-3 rounded-md border border-border/50 bg-[#141c2b] px-2.5 py-1.5 text-sm"
              >
                <span className="w-10 shrink-0 font-mono text-xs font-semibold text-primary">
                  #{member.seed}
                </span>
                <span className="font-medium text-text">
                  {member.resolved ? member.name : `Seed ${member.seed} (not on roster)`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default PodsMembershipPreview;
