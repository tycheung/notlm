import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { UsersAPI } from '../../api/users';
import { EventsAPI } from '../../api/events';
import { getErrorMessage } from '../../api/apiErrors';
import CloseIcon from '@mui/icons-material/Close';
import {
  clearBatchParticipantsDraft,
  loadBatchParticipantsDraft,
  saveBatchParticipantsDraft,
} from '../../utils/batchAddDraftStorage';
import { parseQualifyingAverageInput } from '../../utils/parseQualifyingAverage';
import { UserCreateMinimal, Role } from '../../types/user';

const LAST_FIELD_INDEX = 3;

interface ParticipantRow {
  id: string;
  usbc_id: string;
  first_name: string;
  last_name: string;
  qualifying_average: string;
  user_id?: number;
  isExisting: boolean;
  isValid: boolean;
}

function emptyParticipantRow(id?: string): ParticipantRow {
  return {
    id: id ?? Date.now().toString(),
    usbc_id: '',
    first_name: '',
    last_name: '',
    qualifying_average: '',
    isExisting: false,
    isValid: false,
  };
}

function normalizeParticipantRow(row: ParticipantRow): ParticipantRow {
  return {
    ...row,
    qualifying_average: row.qualifying_average ?? '',
  };
}

interface BatchAddParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  existingParticipants?: number[];
  onSuccess?: () => void;
}

const BatchAddParticipantsModal: React.FC<BatchAddParticipantsModalProps> = ({
  isOpen,
  onClose,
  eventId,
  existingParticipants = [],
  onSuccess
}) => {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);

  
  const queryClient = useQueryClient();
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  
  // Cache for USBC lookups to avoid repeated API calls
  const usbcCache = useRef<Map<string, any>>(new Map());
  
  // Debounce timers for each row
  const debounceTimers = useRef<Map<string, number>>(new Map());

  // Initialize from draft or one empty row
  useEffect(() => {
    if (isOpen) {
      const draft = loadBatchParticipantsDraft(eventId);
      if (draft?.participants?.length) {
        setParticipants(
          (draft.participants as ParticipantRow[]).map(normalizeParticipantRow)
        );
        setCurrentRowIndex(draft.currentRowIndex ?? 0);
      } else {
        setParticipants([emptyParticipantRow('1')]);
        setCurrentRowIndex(0);
      }
      setError(null);
      setSuccessMessage(null);
    } else {
      // Clean up debounce timers when modal closes
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      debounceTimers.current.clear();
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      saveBatchParticipantsDraft(eventId, {
        v: 1,
        participants: participants.map((p) => ({ ...p })),
        currentRowIndex,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [isOpen, eventId, participants, currentRowIndex]);

  // Focus the first input when modal opens
  useEffect(() => {
    if (isOpen && inputRefs.current[0] && inputRefs.current[0][0]) {
      setTimeout(() => {
        inputRefs.current[0][0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Optimized USBC ID lookup with debouncing and caching
  const handleUSBCLookup = useCallback(async (usbcId: string, rowIndex: number, rowId: string) => {
    const trimmedUsbcId = usbcId.trim();
    
    // Optional USBC: do not clear typed names when leaving USBC blank
    if (!trimmedUsbcId) {
      updateParticipant(rowIndex, { user_id: undefined, isExisting: false });
      return;
    }

    // Check cache first
    if (usbcCache.current.has(trimmedUsbcId)) {
      const cachedResult = usbcCache.current.get(trimmedUsbcId);
      updateParticipant(rowIndex, {
        first_name: cachedResult.first_name,
        last_name: cachedResult.last_name,
        user_id: cachedResult.user_id,
        isExisting: cachedResult.isExisting
      });
      
      // If user found, focus back to USBC ID field for next tab to create new row
      if (cachedResult.isExisting) {
        setTimeout(() => {
          if (inputRefs.current[rowIndex] && inputRefs.current[rowIndex][0]) {
            inputRefs.current[rowIndex][0]?.focus();
          }
        }, 50);
      }
      return;
    }

    // Clear any existing debounce timer for this row
    const existingTimer = debounceTimers.current.get(rowId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(async () => {
      try {
        const result = await UsersAPI.searchUSBC(trimmedUsbcId);
        
        // Cache the result
        const cacheData = {
          first_name: result.has_existing_profile && result.existing_user ? result.existing_user.first_name : '',
          last_name: result.has_existing_profile && result.existing_user ? result.existing_user.last_name : '',
          user_id: result.has_existing_profile && result.existing_user ? result.existing_user.id : undefined,
          isExisting: result.has_existing_profile
        };
        usbcCache.current.set(trimmedUsbcId, cacheData);
        
        // Update the participant
        updateParticipant(rowIndex, cacheData);
        
        // If user found, focus back to USBC ID field for next tab to create new row
        if (cacheData.isExisting) {
          setTimeout(() => {
            if (inputRefs.current[rowIndex] && inputRefs.current[rowIndex][0]) {
              inputRefs.current[rowIndex][0]?.focus();
            }
          }, 50);
        }
        
      } catch (error) {
        console.error('Error looking up USBC ID:', error);
        updateParticipant(rowIndex, { user_id: undefined, isExisting: false });
      }
      
      // Clean up timer
      debounceTimers.current.delete(rowId);
    }, 300); // 300ms debounce delay

    debounceTimers.current.set(rowId, timer);
  }, []);

  // Update participant data
  const updateParticipant = (rowIndex: number, updates: Partial<ParticipantRow>) => {
    setParticipants(prev => {
      const newParticipants = [...prev];
      newParticipants[rowIndex] = {
        ...newParticipants[rowIndex],
        ...updates,
        isValid: validateRow({ ...newParticipants[rowIndex], ...updates })
      };
      return newParticipants;
    });
  };

  // Validate a row: existing profile from lookup, or new bowler with first + last (USBC optional)
  const validateRow = (row: ParticipantRow): boolean => {
    return !!(
      (row.isExisting && row.user_id) ||
      (row.first_name.trim() && row.last_name.trim())
    );
  };

  // Handle input change
  const handleInputChange = (rowIndex: number, field: keyof ParticipantRow, value: string) => {
    const participant = participants[rowIndex];
    
    // Prevent changes to first_name and last_name if user is found
    if ((field === 'first_name' || field === 'last_name') && participant.isExisting) {
      return;
    }

    if (field === 'usbc_id' && !value.trim()) {
      updateParticipant(rowIndex, {
        usbc_id: '',
        user_id: undefined,
        isExisting: false,
      });
      return;
    }
    
    updateParticipant(rowIndex, { [field]: value });

    // If USBC ID changed, trigger optimized lookup
    if (field === 'usbc_id') {
      handleUSBCLookup(value, rowIndex, participant.id);
    }
  };

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, fieldIndex: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const participant = participants[rowIndex];
      const nextFieldIndex = fieldIndex + 1;
      
      // Check if current row is "full" (either existing user or manually completed)
      const isRowComplete = participant.isExisting ||
        (participant.first_name.trim() && participant.last_name.trim());

      // Existing profiles: skip locked name fields when tabbing from USBC
      if (isRowComplete && participant.isExisting && fieldIndex === 0) {
        focusField(rowIndex, LAST_FIELD_INDEX);
        return;
      }
      
      // If row is complete and we're on qual avg field, create new row
      if (isRowComplete && fieldIndex === LAST_FIELD_INDEX) {
        addRow();
        return;
      }
      
      // If we're at the last field and row is not complete, move to next field
      if (nextFieldIndex > LAST_FIELD_INDEX) {
        // Move to next row or create new row
        if (rowIndex === participants.length - 1) {
          addRow();
        } else {
          // Move to next row
          setCurrentRowIndex(rowIndex + 1);
          focusField(rowIndex + 1, 0);
        }
      } else {
        // Move to next field in same row
        focusField(rowIndex, nextFieldIndex);
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      // Handle Shift+Tab (backward navigation)
      e.preventDefault();
      
      const participant = participants[rowIndex];
      const prevFieldIndex = fieldIndex - 1;
      
      // Check if current row is "full" (either existing user or manually completed)
      const isRowComplete = participant.isExisting ||
        (participant.first_name.trim() && participant.last_name.trim());
      
      // If we're on the first field (USBC ID), move to previous row
      if (fieldIndex === 0) {
        if (rowIndex > 0) {
          // Check if previous row is complete (autofilled or manually filled)
          const prevParticipant = participants[rowIndex - 1];
          const isPrevRowComplete = prevParticipant.isExisting || 
            (prevParticipant.first_name.trim() && prevParticipant.last_name.trim());
          
          if (isPrevRowComplete) {
            // If previous row is complete, go to their USBC ID field (skip autofilled fields)
            setTimeout(() => {
              if (inputRefs.current[rowIndex - 1] && inputRefs.current[rowIndex - 1][0]) {
                inputRefs.current[rowIndex - 1][0]?.focus();
              }
            }, 50);
          } else {
            // If previous row is not complete, go to their last editable field
            setTimeout(() => {
              if (inputRefs.current[rowIndex - 1] && inputRefs.current[rowIndex - 1][LAST_FIELD_INDEX]) {
                inputRefs.current[rowIndex - 1][LAST_FIELD_INDEX]?.focus();
              }
            }, 50);
          }
        }
        return;
      }
      
      // If current row is complete and we're on first name or last name field, skip to USBC ID
      if (isRowComplete && (fieldIndex === 1 || fieldIndex === 2)) {
        setTimeout(() => {
          if (inputRefs.current[rowIndex] && inputRefs.current[rowIndex][0]) {
            inputRefs.current[rowIndex][0]?.focus();
          }
        }, 50);
        return;
      }
      
      // Move to previous field in same row
      setTimeout(() => {
        if (inputRefs.current[rowIndex] && inputRefs.current[rowIndex][prevFieldIndex]) {
          inputRefs.current[rowIndex][prevFieldIndex]?.focus();
        }
      }, 50);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Same as Tab
      handleKeyDown({ ...e, key: 'Tab' } as React.KeyboardEvent, rowIndex, fieldIndex);
    }
  };

  // Remove a row
  const removeRow = (rowIndex: number) => {
    if (participants.length > 1) {
      setParticipants(prev => prev.filter((_, index) => index !== rowIndex));
    }
  };

  const addRow = () => {
    setParticipants((prev) => {
      const newIndex = prev.length;
      setCurrentRowIndex(newIndex);
      setTimeout(() => {
        inputRefs.current[newIndex]?.[0]?.focus();
      }, 50);
      return [...prev, emptyParticipantRow()];
    });
  };

  const focusField = (rowIndex: number, fieldIndex: number) => {
    setTimeout(() => {
      inputRefs.current[rowIndex]?.[fieldIndex]?.focus();
    }, 50);
  };

  // Check if a specific participant is a duplicate
  const isParticipantDuplicate = (participant: ParticipantRow) => {
    if (!participant.isValid) return false;
    
    // Check against existing participants
    if (participant.user_id && existingParticipants.includes(participant.user_id)) {
      return true;
    }
    
    // Check for duplicates within the participants being added
    const key = `${participant.usbc_id}-${participant.first_name}-${participant.last_name}`.toLowerCase();
    const sameParticipants = participants.filter(p => 
      p.isValid && `${p.usbc_id}-${p.first_name}-${p.last_name}`.toLowerCase() === key
    );
    
    return sameParticipants.length > 1;
  };

  // Process all participants
  const handleSave = async () => {
    // Step 1: Remove empty rows and filter valid participants
    const nonEmptyParticipants = participants.filter(p => 
      p.usbc_id.trim() || p.first_name.trim() || p.last_name.trim()
    );
    
    const validParticipants = nonEmptyParticipants.filter(p => p.isValid);
    
    if (validParticipants.length === 0) {
      setError('Please enter at least one valid participant.');
      return;
    }

    for (const p of validParticipants) {
      const parsed = parseQualifyingAverageInput(p.qualifying_average);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const newUsers = validParticipants.filter((p) => !p.isExisting);

      let createdUsers: { id: number }[] = [];
      if (newUsers.length > 0) {
        const newUserData: UserCreateMinimal[] = newUsers.map((user) => ({
          first_name: user.first_name,
          last_name: user.last_name,
          role: Role.BOWLER,
          ...(user.usbc_id.trim() ? { usbc_id: user.usbc_id.trim() } : {}),
        }));

        createdUsers = await UsersAPI.batchCreateMinimalUsers(newUserData);
      }

      let newUserIndex = 0;
      const participantsData: {
        user_id: number;
        notes: string;
        qualifying_average?: number;
      }[] = [];

      for (const p of validParticipants) {
        let userId: number;
        if (p.isExisting && p.user_id) {
          userId = p.user_id;
        } else {
          userId = createdUsers[newUserIndex]?.id;
          newUserIndex += 1;
          if (!userId) {
            throw new Error(
              `Failed to get user ID for ${p.first_name} ${p.last_name}. User creation may have failed.`
            );
          }
        }

        if (existingParticipants.includes(userId)) {
          continue;
        }

        const parsed = parseQualifyingAverageInput(p.qualifying_average);
        participantsData.push({
          user_id: userId,
          notes: 'Added via batch registration',
          ...(parsed.ok && parsed.value !== undefined
            ? { qualifying_average: parsed.value }
            : {}),
        });
      }

      if (participantsData.length === 0) {
        setError('All selected users are already registered for this event.');
        return;
      }

      await EventsAPI.batchAddParticipantsToEvent(eventId, participantsData);

      clearBatchParticipantsDraft(eventId);

      // Refresh the participants list
      queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });

      setSuccessMessage(
        `Successfully registered ${participantsData.length} participant${participantsData.length !== 1 ? 's' : ''}.`
      );
      
      // Close modal after a short delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('Error processing participants:', error);
      setError(
        getErrorMessage(error, 'Failed to register participants. Please try again.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Participants (Batch)"
      size="xlarge"
      className="max-h-[90vh] overflow-y-auto"
      closeOnOutsideClick={false}
    >
      <div className="space-y-6">
        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {successMessage && (
          <Alert
            variant="success"
            message={successMessage}
          />
        )}

                 <div className="bg-accent/15 border border-blue-200 rounded-lg p-4">
           <h3 className="text-sm font-medium text-blue-800 mb-2">Instructions:</h3>
           <ul className="text-sm text-blue-700 space-y-1">
             <li>• Enter USBC ID in the first column to look up a bowler; names auto-populate if found</li>
             <li>• Or leave USBC blank and enter first and last name — a temporary USBC is assigned on save</li>
             <li>• If user found, first/last name fields will be greyed out and cursor returns to USBC ID</li>
             <li>• If no user found for a USBC, enter first and last names manually</li>
             <li>• Optional qual avg (0–300) can be entered here or set later on the participant roster</li>
             <li>• Use <strong>Add row</strong> or press Tab after qual avg to enter another bowler</li>
             <li>• Press Enter to move to the next field</li>
             <li>• Empty rows are automatically removed when saving</li>
             <li>• Click "Save Changes" to register all participants</li>
           </ul>
         </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-surface-light px-4 py-3 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-text-muted">
              <div className="col-span-2">USBC ID</div>
              <div className="col-span-2">First Name</div>
              <div className="col-span-2">Last Name</div>
              <div className="col-span-2">Qual. avg</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {participants.map((participant, rowIndex) => (
              <div
                key={participant.id}
                className={`px-4 py-3 border-b last:border-b-0 ${
                  rowIndex === currentRowIndex ? 'bg-accent/15' : 'bg-surface'
                } ${
                  isParticipantDuplicate(participant) ? 'ring-2 ring-red-500 ring-opacity-75 bg-danger/15' : ''
                }`}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-2">
                    <input
                      ref={el => {
                        if (!inputRefs.current[rowIndex]) inputRefs.current[rowIndex] = [];
                        inputRefs.current[rowIndex][0] = el;
                      }}
                      type="text"
                      value={participant.usbc_id}
                      onChange={(e) => handleInputChange(rowIndex, 'usbc_id', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                      placeholder="Enter USBC ID"
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  <div className="col-span-2">
                     <input
                       ref={el => {
                         if (!inputRefs.current[rowIndex]) inputRefs.current[rowIndex] = [];
                         inputRefs.current[rowIndex][1] = el;
                       }}
                       type="text"
                       value={participant.first_name}
                       onChange={(e) => handleInputChange(rowIndex, 'first_name', e.target.value)}
                       onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                       placeholder="First Name"
                       disabled={participant.isExisting}
                       className={`w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
                         participant.isExisting 
                           ? 'bg-surface-light text-text-muted cursor-not-allowed' 
                           : 'bg-surface text-text'
                       }`}
                     />
                   </div>
                   
                   <div className="col-span-2">
                     <input
                       ref={el => {
                         if (!inputRefs.current[rowIndex]) inputRefs.current[rowIndex] = [];
                         inputRefs.current[rowIndex][2] = el;
                       }}
                       type="text"
                       value={participant.last_name}
                       onChange={(e) => handleInputChange(rowIndex, 'last_name', e.target.value)}
                       onKeyDown={(e) => handleKeyDown(e, rowIndex, 2)}
                       placeholder="Last Name"
                       disabled={participant.isExisting}
                       className={`w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
                         participant.isExisting 
                           ? 'bg-surface-light text-text-muted cursor-not-allowed' 
                           : 'bg-surface text-text'
                       }`}
                     />
                   </div>

                  <div className="col-span-2">
                    <input
                      ref={el => {
                        if (!inputRefs.current[rowIndex]) inputRefs.current[rowIndex] = [];
                        inputRefs.current[rowIndex][3] = el;
                      }}
                      type="number"
                      min={0}
                      max={300}
                      step="0.1"
                      value={participant.qualifying_average}
                      onChange={(e) =>
                        handleInputChange(rowIndex, 'qualifying_average', e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 3)}
                      placeholder="Optional — add later"
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-text"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      {participant.isValid && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          participant.isExisting 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {participant.isExisting ? 'Existing' : 'New'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    {participants.length > 1 && (
                      <button
                        onClick={() => removeRow(rowIndex)}
                        className="p-1 text-red-600 hover:text-red-800 bg-transparent border border-transparent hover:bg-transparent hover:border-transparent rounded transition-colors"
                        title="Remove participant"
                      >
                        <CloseIcon className="w-4 h-4 font-bold" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-border bg-surface-light px-4 py-2">
            <Button type="button" variant="outline" size="small" onClick={addRow}>
              Add row
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-text-muted">
            {participants.filter(p => p.isValid).length} valid participant{participants.filter(p => p.isValid).length !== 1 ? 's' : ''} ready to register
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="lightbackground"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="darkbackground"
              onClick={handleSave}
              disabled={isProcessing || participants.filter(p => p.isValid).length === 0}
              isLoading={isProcessing}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BatchAddParticipantsModal;
