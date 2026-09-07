/**
 * Playwright DOM/a11y inventory types.
 * Crawl implementation lands in mapper-002+.
 */

export type InventoriedControl = {
  role: string;
  name: string;
  selectorHint: string;
  existingGuideId: string | null;
  proposedGuideId: string;
  url: string;
  landmark?: string;
};

export type ControlInventory = {
  capturedAt: string;
  baseUrl: string;
  controls: InventoriedControl[];
};

export const MAPPER_STATUS = 'bootstrap' as const;
