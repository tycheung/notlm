import { describe, expect, it } from 'vitest';
import { buildEventPodsReportDocument } from '@/components/event-reports/buildEventPodsReportDocument';
import type { PodsMembershipPreviewPod } from '@/utils/podsScoringGroups';

function pod(
  podIndex: number,
  members: Array<{ seed: number; name: string }>,
  advanceCount = 2
): PodsMembershipPreviewPod {
  return {
    podIndex,
    seeds: members.map((m) => m.seed),
    members: members.map((m) => ({
      seed: m.seed,
      name: m.name,
      resolved: true,
    })),
    advanceCount,
  };
}

describe('buildEventPodsReportDocument', () => {
  it('builds a portrait pods roster with names and advance counts', () => {
    const doc = buildEventPodsReportDocument({
      pods: [
        pod(0, [
          { seed: 1, name: 'Amber Smith' },
          { seed: 4, name: 'Andy Heling' },
          { seed: 7, name: 'Brian Warren' },
        ]),
        pod(1, [
          { seed: 2, name: 'Chris Lane' },
          { seed: 5, name: 'Dana Fry' },
        ]),
      ],
      isTeamEvent: false,
      podSizeMin: 4,
      podSizeMax: 6,
      balanceMode: 'snake',
      tournamentName: 'Victory Classic',
      eventName: 'Test pods format',
      roundName: 'Round 2: Pods',
    });

    expect(doc.title).toBe('Pods');
    expect(doc.suggestedFilename).toContain('pods');
    expect(doc.suggestedFilename).toContain('Test_pods_format');
    expect(doc.suggestedFilename).toContain('Round_2_Pods');
    expect(doc.html).toContain('letter portrait');
    expect(doc.html).toContain('Victory Classic · Test pods format · Round 2: Pods');
    expect(doc.html).toContain('2 pods · 5 bowlers · Pod size 4–6 · snake');
    expect(doc.html).toContain('Pod 1');
    expect(doc.html).toContain('Pod 2');
    expect(doc.html).toContain('Amber Smith');
    expect(doc.html).toContain('top 2 advance');
    expect(doc.html).toContain('Simultaneous pinfall within each pod');
    expect(doc.html).toContain('class="ep-grid"');
  });

  it('uses landscape layout for many pods', () => {
    const pods = Array.from({ length: 9 }, (_, index) =>
      pod(index, [{ seed: index + 1, name: `Bowler ${index + 1}` }], 1)
    );
    const doc = buildEventPodsReportDocument({
      pods,
      isTeamEvent: false,
      eventName: 'Large field',
      roundName: 'Pods',
    });
    expect(doc.html).toContain('letter landscape');
  });

  it('shows empty state when no pods are configured', () => {
    const doc = buildEventPodsReportDocument({
      pods: [],
      isTeamEvent: true,
      eventName: 'Trios',
      roundName: 'Finals',
    });
    expect(doc.html).toContain('No pod rosters yet');
    expect(doc.html).toContain('class="ep-empty"');
  });

  it('marks unresolved roster seeds in italics', () => {
    const doc = buildEventPodsReportDocument({
      pods: [
        {
          podIndex: 0,
          seeds: [3],
          members: [{ seed: 3, name: '', resolved: false }],
          advanceCount: 1,
        },
      ],
      isTeamEvent: false,
      roundName: 'Pods',
    });
    expect(doc.html).toContain('Seed 3 (not on roster)');
    expect(doc.html).toContain('ep-unresolved');
  });
});
