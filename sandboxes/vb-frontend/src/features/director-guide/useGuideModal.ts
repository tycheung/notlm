import { useEffect } from 'react';
import type { GuideModalKey } from './types';
import { useOptionalDirectorGuide } from './GuideProvider';

/**
 * Page-local modal opens when the guide requests this modal key after navigation.
 * No-ops outside DirectorGuideProvider (e.g. public event pages).
 */
export function useGuideModal(key: GuideModalKey, open: () => void): void {
  const guide = useOptionalDirectorGuide();
  const pendingModal = guide?.pendingModal ?? null;
  const clearPendingModal = guide?.clearPendingModal;

  useEffect(() => {
    if (!guide || pendingModal !== key) return;
    open();
    clearPendingModal?.();
  }, [guide, pendingModal, key, open, clearPendingModal]);
}
