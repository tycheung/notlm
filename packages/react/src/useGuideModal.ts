import { useCallback, useState } from 'react';

/**
 * Host-side pending modal bridge for pack `openModal` keys.
 * Wire `openModal` into NotLMProvider; render dialogs when `pendingModal` is set.
 */
export function useGuideModal() {
  const [pendingModal, setPendingModal] = useState<string | null>(null);
  const openModal = useCallback((key: string) => {
    setPendingModal(key);
  }, []);
  const clearModal = useCallback(() => {
    setPendingModal(null);
  }, []);
  return { pendingModal, openModal, clearModal };
}
