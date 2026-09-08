import { useState } from 'react';

interface UseMessageStateReturn {
  assignmentError: string | null;
  setAssignmentError: (error: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (message: string | null) => void;
}

export const useMessageState = (): UseMessageStateReturn => {
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return {
    assignmentError,
    setAssignmentError,
    successMessage,
    setSuccessMessage
  };
};
