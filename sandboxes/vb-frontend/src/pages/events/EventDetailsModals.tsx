import React from 'react';
import type { EventComplete } from '../../types/event';
import type { UserEventFormatTemplateRead } from '../../types/eventFormatTemplate';
import {
  ChampionshipResultsCard,
  FinalPayoutsContent,
} from '../../components/event/basicinfo';
import RoundLiveScoresModal from '../../components/event/basicinfo/RoundLiveScoresModal';
import EventReportsMenuModal from '../../components/event-reports/EventReportsMenuModal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AddParticipantsModal from '../../components/event/AddParticipantsModal';
import BatchAddParticipantsModal from '../../components/event/BatchAddParticipantsModal';
import BatchAddTeamMembersModal from '../../components/event/BatchAddTeamMembersModal';
import QuickTeamRegistrationModal from '../../components/event/QuickTeamRegistrationModal';
import TeamRegistrationModal from '../../components/event/TeamRegistrationModal';
import EventShareModal from '../../components/event/EventShareModal';
import DirectorPermissionsModal from '../../components/director/DirectorPermissionsModal';
import SaveEventFormatLibraryModal from '../../components/event/SaveEventFormatLibraryModal';
import { formatDateNaive } from '../../utils/dateUtils';

export interface EventDetailsModalsProps {
  eventId: number;
  eventComplete: EventComplete;
  participantUserIds: number[];
  userId: number | null | undefined;
  canEditEventInfo: boolean;
  canRecomputeChampionship: boolean;
  hasOperationalProgress: boolean;
  formatTemplates: UserEventFormatTemplateRead[];

  showAddParticipantsModal: boolean;
  onCloseAddParticipants: () => void;
  showBatchAddParticipantsModal: boolean;
  onCloseBatchAddParticipants: () => void;
  showBatchAddTeamMembersModal: boolean;
  onCloseBatchAddTeamMembers: () => void;
  showQuickTeamRegistrationModal: boolean;
  onCloseQuickTeamRegistration: () => void;
  onParticipantsRefresh: () => void;

  publicSinglesOpen: boolean;
  onClosePublicSingles: () => void;
  pubFirstName: string;
  onPubFirstNameChange: (value: string) => void;
  pubLastName: string;
  onPubLastNameChange: (value: string) => void;
  pubUsbc: string;
  onPubUsbcChange: (value: string) => void;
  onSubmitPublicSingles: () => void;
  publicSinglesPending: boolean;

  isTeamSignUpOpen: boolean;
  onCloseTeamSignUp: () => void;
  onTeamSignUpRegistered: () => void;

  saveFormatLibraryOpen: boolean;
  onCloseSaveFormatLibrary: () => void;
  onFormatLibrarySaved: (message: string) => void;

  isShareModalOpen: boolean;
  onCloseShareModal: () => void;

  directorPermissionsModalOpen: boolean;
  onCloseDirectorPermissions: () => void;

  liveScoresRoundId: number | null;
  onCloseLiveScores: () => void;

  championshipResultsOpen: boolean;
  selectedFinalNodeId: number | null;
  onCloseChampionshipResults: () => void;

  finalPayoutsOpen: boolean;
  onCloseFinalPayouts: () => void;

  eventReportsOpen: boolean;
  onCloseEventReports: () => void;

  loadFormatConfirmOpen: boolean;
  onCloseLoadFormatConfirm: () => void;
  onConfirmApplyFormat: () => void;
}

const EventDetailsModals: React.FC<EventDetailsModalsProps> = ({
  eventId,
  eventComplete,
  participantUserIds,
  userId,
  canEditEventInfo,
  canRecomputeChampionship,
  hasOperationalProgress,
  formatTemplates,
  showAddParticipantsModal,
  onCloseAddParticipants,
  showBatchAddParticipantsModal,
  onCloseBatchAddParticipants,
  showBatchAddTeamMembersModal,
  onCloseBatchAddTeamMembers,
  showQuickTeamRegistrationModal,
  onCloseQuickTeamRegistration,
  onParticipantsRefresh,
  publicSinglesOpen,
  onClosePublicSingles,
  pubFirstName,
  onPubFirstNameChange,
  pubLastName,
  onPubLastNameChange,
  pubUsbc,
  onPubUsbcChange,
  onSubmitPublicSingles,
  publicSinglesPending,
  isTeamSignUpOpen,
  onCloseTeamSignUp,
  onTeamSignUpRegistered,
  saveFormatLibraryOpen,
  onCloseSaveFormatLibrary,
  onFormatLibrarySaved,
  isShareModalOpen,
  onCloseShareModal,
  directorPermissionsModalOpen,
  onCloseDirectorPermissions,
  liveScoresRoundId,
  onCloseLiveScores,
  championshipResultsOpen,
  selectedFinalNodeId,
  onCloseChampionshipResults,
  finalPayoutsOpen,
  onCloseFinalPayouts,
  eventReportsOpen,
  onCloseEventReports,
  loadFormatConfirmOpen,
  onCloseLoadFormatConfirm,
  onConfirmApplyFormat,
}) => (
  <>
    <AddParticipantsModal
      isOpen={showAddParticipantsModal}
      onClose={onCloseAddParticipants}
      eventId={eventId}
      existingParticipants={participantUserIds}
    />

    <BatchAddParticipantsModal
      isOpen={showBatchAddParticipantsModal}
      onClose={onCloseBatchAddParticipants}
      eventId={eventId}
      existingParticipants={participantUserIds}
      onSuccess={onParticipantsRefresh}
    />

    <QuickTeamRegistrationModal
      isOpen={showQuickTeamRegistrationModal}
      onClose={onCloseQuickTeamRegistration}
      eventId={eventId}
      onTeamRegistered={onParticipantsRefresh}
    />

    <BatchAddTeamMembersModal
      isOpen={showBatchAddTeamMembersModal}
      onClose={onCloseBatchAddTeamMembers}
      eventId={eventId}
      teamSize={eventComplete.team_size || 4}
      existingParticipants={participantUserIds}
      onSuccess={onParticipantsRefresh}
    />

    <Modal
      isOpen={publicSinglesOpen}
      onClose={onClosePublicSingles}
      title="Sign up for this event"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitPublicSingles();
        }}
      >
        <Input
          label="First name"
          value={pubFirstName}
          onChange={(e) => onPubFirstNameChange(e.target.value)}
          required
          fullWidth
          autoComplete="given-name"
        />
        <Input
          label="Last name"
          value={pubLastName}
          onChange={(e) => onPubLastNameChange(e.target.value)}
          required
          fullWidth
          autoComplete="family-name"
        />
        <Input
          label="USBC ID (optional)"
          value={pubUsbc}
          onChange={(e) => onPubUsbcChange(e.target.value)}
          fullWidth
          autoComplete="off"
          placeholder="Encouraged for accurate matching"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="lightbackground"
            onClick={onClosePublicSingles}
            disabled={publicSinglesPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="darkbackground"
            isLoading={publicSinglesPending}
            disabled={publicSinglesPending}
          >
            Submit sign-up
          </Button>
        </div>
      </form>
    </Modal>

    <TeamRegistrationModal
      isOpen={isTeamSignUpOpen}
      onClose={onCloseTeamSignUp}
      eventId={eventId}
      teamSize={eventComplete.team_size || 4}
      signUpMode
      onTeamRegistered={onTeamSignUpRegistered}
    />

    <SaveEventFormatLibraryModal
      source="event"
      isOpen={saveFormatLibraryOpen}
      onClose={onCloseSaveFormatLibrary}
      eventId={eventId}
      userId={userId}
      templates={formatTemplates}
      onSaved={onFormatLibrarySaved}
    />

    <EventShareModal
      isOpen={isShareModalOpen}
      onClose={onCloseShareModal}
      eventId={eventId}
      tournamentId={eventComplete.tournament_id ?? eventComplete.tournament?.id ?? 0}
      eventName={eventComplete.name}
      tournamentName={eventComplete.tournament?.name}
      centerName={
        eventComplete.tournament?.bowling_center_name ||
        eventComplete.tournament?.location
      }
      dateLabel={
        eventComplete.start_date && eventComplete.end_date
          ? `${formatDateNaive(eventComplete.start_date)} – ${formatDateNaive(eventComplete.end_date)}`
          : null
      }
    />

    {eventComplete.tournament && (
      <DirectorPermissionsModal
        isOpen={directorPermissionsModalOpen}
        onClose={onCloseDirectorPermissions}
        scope="event"
        tournamentId={eventComplete.tournament.id}
        eventId={eventId}
      />
    )}

    <RoundLiveScoresModal
      eventId={eventId}
      tournamentId={eventComplete.tournament_id ?? eventComplete.tournament?.id}
      roundId={liveScoresRoundId}
      isOpen={liveScoresRoundId != null}
      onClose={onCloseLiveScores}
      eventPublished={eventComplete.published_at != null}
    />

    <Modal
      isOpen={championshipResultsOpen}
      onClose={onCloseChampionshipResults}
      title="Championship results"
      size="large"
    >
      <ChampionshipResultsCard
        eventId={eventId}
        eventComplete={eventComplete}
        canRecompute={canRecomputeChampionship}
        finalNodeId={selectedFinalNodeId}
      />
    </Modal>

    <Modal
      isOpen={finalPayoutsOpen}
      onClose={onCloseFinalPayouts}
      title="Final Payouts"
      size="large"
    >
      <FinalPayoutsContent eventId={eventId} />
    </Modal>

    {canEditEventInfo && (
      <EventReportsMenuModal
        isOpen={eventReportsOpen}
        onClose={onCloseEventReports}
        tournamentId={eventComplete.tournament_id ?? eventComplete.tournament?.id ?? 0}
        tournamentName={eventComplete.tournament?.name}
        eventId={eventId}
        eventName={eventComplete.name}
        eventFormat={eventComplete.event_format}
        rounds={(eventComplete.rounds || []).map((round) => ({
          id: round.id,
          round_number: round.round_number,
          friendly_name: round.friendly_name,
          game_count: round.game_count,
          competition_method: round.competition_method ?? null,
          competition_method_config: round.competition_method_config ?? null,
        }))}
        squads={(eventComplete.rounds || []).flatMap((round) =>
          (round.squads || []).map((squad) => ({
            id: squad.id,
            name: squad.name || `Squad ${squad.id}`,
            round_id: round.id,
          }))
        )}
        isSaOnly={Boolean(eventComplete.tournament?.is_sa_only)}
      />
    )}

    <ConfirmDialog
      isOpen={loadFormatConfirmOpen}
      onClose={onCloseLoadFormatConfirm}
      onConfirm={onConfirmApplyFormat}
      title="Apply saved structure?"
      message={
        hasOperationalProgress
          ? 'This event already has scoring, lane assignments, or other live progress. Applying a saved format will remove connected data (round flow, squads, games, advancement pools, and championship placements) and rebuild from the selected format. This cannot be undone.'
          : 'This event already has a round and payout structure. Applying a saved format will replace it (including squads tied to those rounds) with the selected format. This cannot be undone.'
      }
      confirmText="Apply"
      confirmVariant="danger"
    />
  </>
);

export default EventDetailsModals;
