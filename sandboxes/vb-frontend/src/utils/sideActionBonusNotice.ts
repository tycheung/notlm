import { bonusPinsConfigured } from './bonusPins';

export interface SideActionBonusNoticeRound {
  competition_method_config?: Record<string, unknown> | null;
}

export function eventHasBonusPinRounds(
  rounds: SideActionBonusNoticeRound[] | null | undefined
): boolean {
  return (rounds || []).some((round) =>
    bonusPinsConfigured(round?.competition_method_config)
  );
}
