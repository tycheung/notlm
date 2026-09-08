import { useState } from 'react';

interface UseModalStateReturn {
  reEntryModalOpen: boolean;
  setReEntryModalOpen: (open: boolean) => void;
  selectedSquadForReEntry: number | null;
  setSelectedSquadForReEntry: (squadId: number | null) => void;
  showUnlockConfirm: boolean;
  setShowUnlockConfirm: (show: boolean) => void;
}

export const useModalState = (): UseModalStateReturn => {
  const [reEntryModalOpen, setReEntryModalOpen] = useState(false);
  const [selectedSquadForReEntry, setSelectedSquadForReEntry] = useState<number | null>(null);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  return {
    reEntryModalOpen,
    setReEntryModalOpen,
    selectedSquadForReEntry,
    setSelectedSquadForReEntry,
    showUnlockConfirm,
    setShowUnlockConfirm
  };
};
