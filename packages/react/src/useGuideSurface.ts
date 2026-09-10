import { useCallback, useState } from 'react';

/**
 * Host-side pending surface bridge for pack `openSurface` keys
 * (drawers, wizards, instruct-only uploads). Wire `openSurface` into
 * UiPilotProvider; pages react when `pendingSurface` matches.
 */
export function useGuideSurfaceBridge() {
  const [pendingSurface, setPendingSurface] = useState<string | null>(null);
  const [pendingSurfaceStep, setPendingSurfaceStep] = useState<string | null>(
    null
  );
  const openSurface = useCallback((key: string, surfaceStep?: string) => {
    setPendingSurface(key);
    setPendingSurfaceStep(surfaceStep ?? null);
  }, []);
  const clearSurface = useCallback(() => {
    setPendingSurface(null);
    setPendingSurfaceStep(null);
  }, []);
  return {
    pendingSurface,
    pendingSurfaceStep,
    openSurface,
    clearSurface,
  };
}
