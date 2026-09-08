import { AdvancementMethod } from '../types/roundRelationship';

/** Matches backend carry-over product surface (eliminator + round robin). */
export function relationshipCarryOverUiAllowed(
  sourceMethod: AdvancementMethod
): boolean {
  return (
    sourceMethod === AdvancementMethod.ELIMINATOR ||
    sourceMethod === AdvancementMethod.ROUND_ROBIN
  );
}
