import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Label from '../common/Label';
import Button from '../common/Button';
import { EventsAPI } from '../../api/events';
import { getErrorMessage } from '../../api/apiErrors';
import { Gender } from '../../types/user';
import type { EventParticipantWithUser } from '../../types/event_participant';

export interface ParticipantDemographicsModalProps {
  eventId: number;
  participant: EventParticipantWithUser | null;
  onClose: () => void;
  onSaved: (result: {
    participantId: number;
    gender: string | null;
    birth_date: string | null;
    is_senior?: boolean;
    is_youth?: boolean;
  }) => void;
}

/**
 * Edit gender / DOB for a rostered bowler (admin / TD desk).
 */
const ParticipantDemographicsModal: React.FC<ParticipantDemographicsModalProps> = ({
  eventId,
  participant,
  onClose,
  onSaved,
}) => {
  const [gender, setGender] = useState<'' | Gender>('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!participant) return;
    const g = participant.user_gender;
    setGender(g === Gender.MALE || g === Gender.FEMALE || g === Gender.OTHER ? g : '');
    setDob(participant.user_birth_date ? String(participant.user_birth_date).slice(0, 10) : '');
    setError(null);
  }, [participant]);

  const handleSubmit = async () => {
    if (!participant) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await EventsAPI.updateParticipantDemographics(eventId, participant.id, {
        gender: gender || null,
        birth_date: dob.trim() ? dob.trim() : null,
      });
      onSaved({
        participantId: participant.id,
        gender: result.gender,
        birth_date: result.birth_date,
        is_senior: result.is_senior,
        is_youth: result.is_youth,
      });
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not update gender / date of birth.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={!!participant}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Edit bowler details"
    >
      {participant && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Update gender and date of birth for <strong>{participant.user_name}</strong>.
            Senior is turned on automatically when the account is 50+ as of the event
            (you can still toggle Youth / Senior on the roster).
          </p>
          {error && (
            <div className="p-3 text-sm text-red-700 bg-danger/15 rounded border border-red-200">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="roster-gender">Gender</Label>
            <select
              id="roster-gender"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
              value={gender}
              onChange={(e) => setGender((e.target.value || '') as '' | Gender)}
            >
              <option value="">Not set</option>
              <option value={Gender.MALE}>Male</option>
              <option value={Gender.FEMALE}>Female</option>
              <option value={Gender.OTHER}>Other</option>
            </select>
          </div>
          <Input
            label="Date of birth"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            fullWidth
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="lightbackground"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="darkbackground"
              onClick={() => void handleSubmit()}
              isLoading={submitting}
              disabled={submitting}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ParticipantDemographicsModal;
