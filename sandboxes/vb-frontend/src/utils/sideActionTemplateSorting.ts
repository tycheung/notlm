import { SideActionType } from '../types/side_action';
import type { UserSideActionTemplateRead } from '../types/sideActionTemplate';
import { formatSideActionType } from './sideActionDisplay';

/** Display order for type sections on the manage page. */
export const SIDE_ACTION_TEMPLATE_TYPE_ORDER: SideActionType[] = [
  SideActionType.BRACKET,
  SideActionType.HIGH_GAME,
  SideActionType.HIGH_SET,
  SideActionType.ELIMINATOR,
  SideActionType.MYSTERY_DOUBLES,
  SideActionType.MYSTERY_GAME,
  SideActionType.LOVE_DOUBLES,
  SideActionType.ALIBI_DOUBLES,
];

export function sortSideActionTemplates(
  templates: UserSideActionTemplateRead[]
): UserSideActionTemplateRead[] {
  return [...templates].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function groupSideActionTemplatesByType(
  templates: UserSideActionTemplateRead[]
): Array<{ type: SideActionType; label: string; templates: UserSideActionTemplateRead[] }> {
  const byType = new Map<string, UserSideActionTemplateRead[]>();
  for (const row of templates) {
    const key = String(row.side_action_type);
    const list = byType.get(key) ?? [];
    list.push(row);
    byType.set(key, list);
  }

  const ordered: Array<{
    type: SideActionType;
    label: string;
    templates: UserSideActionTemplateRead[];
  }> = [];

  for (const type of SIDE_ACTION_TEMPLATE_TYPE_ORDER) {
    const rows = byType.get(type);
    if (!rows?.length) continue;
    ordered.push({
      type,
      label: formatSideActionType(type),
      templates: sortSideActionTemplates(rows),
    });
    byType.delete(type);
  }

  // Any unexpected types still render.
  for (const [key, rows] of byType) {
    if (!rows.length) continue;
    ordered.push({
      type: key as SideActionType,
      label: formatSideActionType(key),
      templates: sortSideActionTemplates(rows),
    });
  }

  return ordered;
}

export function summarizeSideActionTemplatePayload(
  template: UserSideActionTemplateRead
): string {
  const p = template.payload || {};
  const fee = Number(p.entry_fee ?? 0);
  const games = Array.isArray(p.game_numbers) ? p.game_numbers : [];
  const places = Object.keys(p.prize_distribution || {}).length;
  const parts = [
    fee > 0 ? `$${fee.toFixed(fee % 1 ? 2 : 0)} entry` : 'No entry fee',
    games.length ? `Games ${games.join(', ')}` : 'No games',
    places ? `${places} prize place${places === 1 ? '' : 's'}` : 'No prizes',
  ];
  return parts.join(' · ');
}
