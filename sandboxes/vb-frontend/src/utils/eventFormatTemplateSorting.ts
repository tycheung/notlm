import type { UserEventFormatTemplateRead } from '../types/eventFormatTemplate';

export function sortEventFormatTemplates(
  templates: UserEventFormatTemplateRead[]
): UserEventFormatTemplateRead[] {
  return [...templates].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function toEventFormatTemplateOption(
  template: UserEventFormatTemplateRead
): { value: string; label: string } {
  const suffix = template.is_default
    ? ' (default)'
    : template.is_favorite
      ? ' (favorite)'
      : '';
  return { value: String(template.id), label: `${template.name}${suffix}` };
}
