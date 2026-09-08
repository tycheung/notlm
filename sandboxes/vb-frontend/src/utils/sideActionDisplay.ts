import { SideActionType } from '../types/side_action';

const SIDE_ACTION_TYPE_LABELS: Record<string, string> = {
  [SideActionType.BRACKET]: 'Bracket',
  [SideActionType.HIGH_GAME]: 'High Game',
  [SideActionType.HIGH_SET]: 'High Series',
  [SideActionType.ELIMINATOR]: 'Eliminator',
  [SideActionType.MYSTERY_DOUBLES]: 'Mystery Doubles',
  [SideActionType.MYSTERY_GAME]: 'Mystery Game',
  [SideActionType.LOVE_DOUBLES]: 'Love Doubles',
  [SideActionType.ALIBI_DOUBLES]: 'Alibi Doubles',
};

export function formatSideActionType(type: SideActionType | string): string {
  return (
    SIDE_ACTION_TYPE_LABELS[type] ??
    String(type || 'Unknown')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}
