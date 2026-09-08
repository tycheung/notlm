/** Round / squad labels shared across Squads, Format Editor, and structure payloads. */

export type RoundLabelSource = {
  round_number?: number | null;
  friendly_name?: string | null;
  id?: number | null;
};

const GENERIC_SQUAD_NAMES = new Set([
  'qual squad',
  'qualifying squad',
  'squad',
  'squad 1',
]);

/** UI label: `Round 2: Pods` */
export function formatRoundDisplayLabel(round: RoundLabelSource | null | undefined): string {
  if (!round) return 'Round';
  const num = Number(round.round_number);
  const friendly = String(round.friendly_name ?? '').trim();
  if (Number.isFinite(num) && num > 0) {
    return friendly ? `Round ${num}: ${friendly}` : `Round ${num}`;
  }
  if (friendly) return friendly;
  const id = Number(round.id);
  return Number.isFinite(id) && id > 0 ? `Round ${id}` : 'Round';
}

/** Default squad name when applying structure or creating a squad for a round. */
export function defaultSquadNameForRound(
  round: RoundLabelSource | null | undefined,
  opts?: { squadIndex?: number; squadCount?: number; templateName?: string | null }
): string {
  const roundLabel = formatRoundDisplayLabel(round);
  const template = String(opts?.templateName ?? '').trim();
  const idx = Number(opts?.squadIndex ?? 0);
  const count = Math.max(1, Number(opts?.squadCount ?? 1));

  if (template && !isGenericSquadTemplateName(template, round)) {
    return template;
  }

  if (count === 1) return roundLabel;
  return `${roundLabel} · Squad ${idx + 1}`;
}

/** True when a saved template squad name does not match this round (e.g. Final Squad on Pods). */
export function isGenericSquadTemplateName(
  name: string | null | undefined,
  round?: RoundLabelSource | null
): boolean {
  const raw = String(name ?? '').trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  if (lower === 'final squad') {
    const friendly = String(round?.friendly_name ?? '').trim().toLowerCase();
    return friendly !== 'final';
  }
  if (GENERIC_SQUAD_NAMES.has(lower)) return true;
  return false;
}

export function squadNameMatchesRound(
  squadName: string | null | undefined,
  round: RoundLabelSource | null | undefined
): boolean {
  const expected = defaultSquadNameForRound(round).trim().toLowerCase();
  return String(squadName ?? '').trim().toLowerCase() === expected;
}
