import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, matchPath, Navigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { EventFormat, type EventComplete, type EventUpdate } from '../../types/event';
import { EventsAPI } from '../../api/events';
import { DirectorsAPI } from '../../api/directors';
import { getErrorMessage } from '../../api/apiErrors';
import { eventFormatTemplatesApi } from '../../api/eventFormatTemplates';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import {
  AboutEventCard,
  EventRulesCard,
  EventDetailsCard,
  EventReservedLanesCard,
  HandicapInformationCard,
  EventFormatCard,
  PrizePayoutInformationCard,
} from '../../components/event/basicinfo';
import LaneAssignmentPanel from '../../components/event-lane/LaneAssignmentPanel';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import { formatDateNaive } from '../../utils/dateUtils';
import { downloadBlobFromLoader } from '../../utils/downloadBlob';
import { isPersistedRoundCompleted } from '../../utils/statusUtils';
import {
  TabType,
  resolveEventDetailsTab,
  hasEventOperationalProgress,
  shouldConfirmApplyEventFormat,
  normalizeRoundsTabSearchParams,
  normalizeLegacyEventTabSearchParams,
  buildEventDetailsTabItems,
  shouldRedirectUnauthorizedEventDetailsTab,
} from './eventDetailsTabs';
import {
  buildEventDetailsBreadcrumbItems,
  buildEventDetailsTabsForShell,
  resolveEventDetailsShellRedirect,
  resolveHideEventSignupCta,
  type EventDetailsProps,
} from './eventDetailsShell';
import EventDetailsModals from './EventDetailsModals';
import { useEventDetailsTabState, useUnauthorizedEventTabRedirect } from './useEventDetailsTabState';

export {
  TabType,
  resolveEventDetailsTab,
  hasEventOperationalProgress,
  hasEventFlowStructure,
  shouldConfirmApplyEventFormat,
  normalizeRoundsTabSearchParams,
  normalizeLegacyEventTabSearchParams,
  shouldRedirectUnauthorizedEventDetailsTab,
  type EventDetailsTabItem,
  buildEventDetailsTabItems,
} from './eventDetailsTabs';

export type { EventDetailsShellMode, EventDetailsProps } from './eventDetailsShell';
import PageTitle from '../../components/common/PageTitle';
import PageSectionHeading from '../../components/common/PageSectionHeading';
import Breadcrumb from '../../components/common/Breadcrumb';
import Tabs, { TabItem } from '../../components/common/Tabs';

import { invalidateEventFlowStructureQueries } from '../../components/event/flow/RoundFlowManagement';
import ParticipantManagementTable from '../../components/event/ParticipantManagementTable';
import { EventParticipantWithUser } from '../../types/event_participant';
import EventSignupCta from '../../components/event/EventSignupCta';
import EventTdRegistrationSettingsCard from '../../components/event/EventTdRegistrationSettingsCard';
import { SAVE_FORMAT_TO_LIBRARY_BUTTON_LABEL } from '../../components/event/SaveEventFormatLibraryModal';
import {
  SquadsTab,
  GameScoringTab,
} from '../../components/event-round';
import EventSideActionsPanel from '../../components/side_actions/EventSideActionsPanel';
import EventStandingsPanel from '../../components/event/standings/EventStandingsPanel';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SaveIcon from '@mui/icons-material/Save';
import TuneIcon from '@mui/icons-material/Tune';
import EventFlowPreview from '../../components/event/flow/EventFlowPreview';
import EventFormatEditorTab from '../../components/event/EventFormatEditorTab';
import { eventHasHeadToHeadFormatRounds } from '../../utils/headToHeadFormatRounds';
import { sortEventFormatTemplates } from '../../utils/eventFormatTemplateSorting';
import {
  persistAppliedFormatTemplateId,
  readPersistedAppliedFormatTemplateId,
  resolveAppliedFormatTemplateId,
  resolveAppliedStructureFormatLabel,
} from '../../utils/eventAppliedFormatDisplay';
import { useEventDetailsBillingWriteAccess } from './useEventDetailsBillingWriteAccess';
import { useEventLayoutPrefixRedirect } from './useEventLayoutPrefixRedirect';
import { GUIDE_IDS, useGuideModal, useOptionalDirectorGuide } from '../../features/director-guide';
import { isSaOnlyTournament } from '../../utils/saOnly';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { roundRelationshipApi } from '../../services/roundRelationshipApi';
import SaOnlyModeBanner from '../../components/tournament/SaOnlyModeBanner';
import TournamentAccessBanner from '../../components/tournament/TournamentAccessBanner';

const EventDetails: React.FC<EventDetailsProps> = ({ shellMode = 'default' }) => {
  const { id } = useParams<{ id: string }>();
  const eventId = id ? parseInt(id, 10) : 0;
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const roleAwareNav = useRoleAwareNavigation(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  const location = useLocation();
  const isMinimalPublicEventChrome =
    !authLoading &&
    !user &&
    matchPath({ path: '/events/:id', end: true }, location.pathname) != null;

  // Preserve current layout prefix (/admin, /director, or public) for breadcrumb links
  const layoutPrefix = location.pathname.startsWith('/admin')
    ? '/admin'
    : location.pathname.startsWith('/director')
      ? '/director'
      : '';
  const [setupError, setSetupError] = useState<string | null>(location.state?.roundSetupError || null);
  const [isTeamSignUpOpen, setIsTeamSignUpOpen] = useState(false);
  const [publicSinglesOpen, setPublicSinglesOpen] = useState(false);
  const [pubFirstName, setPubFirstName] = useState('');
  const [pubLastName, setPubLastName] = useState('');
  const [pubUsbc, setPubUsbc] = useState('');
  const [signUpBanner, setSignUpBanner] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [directorPermissionsModalOpen, setDirectorPermissionsModalOpen] = useState(false);
  const [liveScoresRoundId, setLiveScoresRoundId] = useState<number | null>(null);
  const [championshipResultsOpen, setChampionshipResultsOpen] = useState(false);
  const [selectedFinalNodeId, setSelectedFinalNodeId] = useState<number | null>(null);
  const [finalPayoutsOpen, setFinalPayoutsOpen] = useState(false);
  const [eventReportsOpen, setEventReportsOpen] = useState(false);
  const guide = useOptionalDirectorGuide();
  const openEventReports = useCallback(() => {
    setEventReportsOpen(true);
    guide?.markReportsSeen();
  }, [guide]);
  useGuideModal('eventReports', openEventReports);

  // Fetch event details with rounds and squads
  const { data: eventComplete, isLoading, error } = useQuery({
    queryKey: ['eventComplete', eventId],
    queryFn: () => EventsAPI.getCompleteEvent(eventId),
    enabled: !!eventId,
  });

  const {
    data: directorAccess,
    isLoading: directorAccessLoading,
    isFetched: directorAccessFetched,
  } = useQuery({
    queryKey: ['directorAccess', eventId],
    queryFn: () => DirectorsAPI.getEventDirectorAccess(eventId),
    enabled:
      !!user &&
      !!eventId &&
      [Role.ADMIN, Role.TD, Role.SA, Role.BOWLER].includes(user.role),
  });

  const needsDirectorAccess =
    !authLoading &&
    !!user &&
    !!eventId &&
    [Role.ADMIN, Role.TD, Role.SA, Role.BOWLER].includes(user.role);
  const directorAccessReady =
    !needsDirectorAccess ||
    (directorAccessFetched && !directorAccessLoading);
  const isDirectorAccessPending = needsDirectorAccess && !directorAccessReady;

  useEventLayoutPrefixRedirect({
    pathname: location.pathname,
    search: location.search || '',
    role: user?.role,
    isInBowlerView: searchParams.get('view') === 'bowler',
    navigate,
  });

  const isAdmin = !!user && user.role === Role.ADMIN;
  const tournamentIdForAccess =
    eventComplete?.tournament_id ?? eventComplete?.tournament?.id ?? 0;
  const {
    canEditEventInfo, canEditEventFormat, canParticipants, canSquads, canLanes,
    canGameScoring, canManageDelegation, saOnly,
  } = useEventDetailsBillingWriteAccess({
    tournamentId: tournamentIdForAccess,
    tournament: eventComplete?.tournament,
    billing: user?.billing,
    isAdmin,
    enabled: !!user,
    directorAccess,
  });

  const hideEventSignupCta = resolveHideEventSignupCta({
    userId: user?.id,
    role: user?.role,
    organizerId: eventComplete?.tournament?.organizer_id,
    isTournamentOrganizerOrCoOwner: directorAccess?.is_tournament_organizer_or_co_owner,
  });

  const canRecomputeChampionship = canEditEventFormat;
  const canManageFormatsOnInfoFlow = canEditEventFormat;
  const canSaveFormatOnInfoFlow =
    canEditEventFormat ||
    (!!eventComplete?.published_at && !eventComplete?.hide_event_format_sharing);
  const canFormatEditor =
    canEditEventFormat && eventHasHeadToHeadFormatRounds(eventComplete);
  const isSaDesk = shellMode === 'saDesk';
  const showLanesTab = canLanes && !saOnly && !isSaDesk;
  const showFormatEditorTab = canFormatEditor && !saOnly && !isSaDesk;
  const showStandingsTab = canEditEventInfo && !saOnly && !isSaDesk;
  
  const tabParam = searchParams.get('tab');
  const { activeTab, handleTabChange } = useEventDetailsTabState({
    tabParam,
    setSearchParams,
    shellMode,
  });

  const [showAddParticipantsModal, setShowAddParticipantsModal] = useState(false);
  const [showBatchAddParticipantsModal, setShowBatchAddParticipantsModal] = useState(false);
  const openAddParticipants = useCallback(() => setShowBatchAddParticipantsModal(true), []);
  useGuideModal('addParticipants', openAddParticipants);
  const [showBatchAddTeamMembersModal, setShowBatchAddTeamMembersModal] = useState(false);
  const [showQuickTeamRegistrationModal, setShowQuickTeamRegistrationModal] = useState(false);
  const participantsCsvInputRef = useRef<HTMLInputElement>(null);
  const [csvUploadMessage, setCsvUploadMessage] = useState<string | null>(null);
  const [csvUploadError, setCsvUploadError] = useState<string | null>(null);
  const [csvUploadAlertVariant, setCsvUploadAlertVariant] = useState<'success' | 'warning'>('success');
  const [csvUploading, setCsvUploading] = useState(false);

  const [saveFormatLibraryOpen, setSaveFormatLibraryOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [applyFormatError, setApplyFormatError] = useState<string | null>(null);
  const [applyFormatSuccess, setApplyFormatSuccess] = useState<string | null>(null);
  const [loadFormatConfirmOpen, setLoadFormatConfirmOpen] = useState(false);
  /** Synchronous template id for confirm apply (avoids stale state vs. backend round count). */
  const pendingFormatTemplateIdRef = useRef<number | null>(null);

  const { data: formatTemplatesRaw } = useQuery({
    queryKey: ['eventFormatTemplates'],
    queryFn: () => eventFormatTemplatesApi.list(),
    enabled: !!user && (isAdmin || !!directorAccess?.can_manage_event_format),
  });
  const formatTemplates = sortEventFormatTemplates(
    Array.isArray(formatTemplatesRaw) ? formatTemplatesRaw : []
  );
  const { data: roundRelationships = [] } = useQuery({
    queryKey: ['roundRelationships', eventId],
    queryFn: () => roundRelationshipApi.getAllRoundRelationshipsForEvent(eventId),
    enabled: eventId > 0,
  });

  // Mutation for updating event data
  const updateEventMutation = useMutation({
    mutationFn: (updateData: EventUpdate) => EventsAPI.updateEvent(eventId, updateData),
    onMutate: async (updateData: EventUpdate) => {
      await queryClient.cancelQueries({ queryKey: ['eventComplete', eventId] });
      const previousEventComplete = queryClient.getQueryData(['eventComplete', eventId]);
      queryClient.setQueryData(['eventComplete', eventId], (current: any) =>
        current ? { ...current, ...updateData } : current
      );
      return { previousEventComplete };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventRounds'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] });
      queryClient.invalidateQueries({ queryKey: ['squadParticipants'] });
      queryClient.invalidateQueries({ queryKey: ['squadGames'] });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousEventComplete) {
        queryClient.setQueryData(['eventComplete', eventId], context.previousEventComplete);
      }
      console.error('Error updating event:', error);
      throw error; // Re-throw to be handled by EditableCard
    },
  });

  const applyFormatMutation = useMutation({
    mutationFn: (opts: {
      templateId: number | null;
      replaceExistingStructure?: boolean;
    }) =>
      eventFormatTemplatesApi.applyToEvent({
        event_id: eventId,
        template_id: opts.templateId,
        replace_existing_structure: opts.replaceExistingStructure ?? false,
      }),
    onSuccess: async (_data, variables) => {
      setApplyFormatError(null);
      setApplyFormatSuccess('Format applied successfully.');
      persistAppliedFormatTemplateId(eventId, variables.templateId, formatTemplates);
      const appliedTemplateId =
        variables.templateId ?? formatTemplates.find((t) => t.is_default)?.id ?? null;
      setSelectedTemplateId(appliedTemplateId);
      invalidateEventFlowStructureQueries(queryClient, eventId);
      await queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['eventChampionshipResults', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['squadParticipants'] });
      await queryClient.invalidateQueries({ queryKey: ['squadGames'] });
      await queryClient.invalidateQueries({ queryKey: ['eventFormatTemplates'] });
    },
    onError: (err: unknown) => {
      setApplyFormatSuccess(null);
      setApplyFormatError(getErrorMessage(err, 'Could not apply format from library.'));
    },
  });

  const persistedFormatTemplateId = readPersistedAppliedFormatTemplateId(eventId);
  const resolvedAppliedFormatTemplateId = useMemo(() => {
    if (!eventComplete) return null;
    return resolveAppliedFormatTemplateId({
      event: eventComplete,
      templates: formatTemplates,
      selectedTemplateId,
      persistedTemplateId: persistedFormatTemplateId,
    });
  }, [
    eventComplete,
    formatTemplates,
    selectedTemplateId,
    persistedFormatTemplateId,
    eventId,
  ]);

  const appliedStructureFormatLabel = useMemo(() => {
    if (!eventComplete) return 'Not selected';
    return resolveAppliedStructureFormatLabel({
      event: eventComplete,
      templates: formatTemplates,
      selectedTemplateId: resolvedAppliedFormatTemplateId,
      persistedTemplateId: persistedFormatTemplateId,
      relationships: roundRelationships,
    });
  }, [
    eventComplete,
    formatTemplates,
    resolvedAppliedFormatTemplateId,
    persistedFormatTemplateId,
    roundRelationships,
  ]);

  useEffect(() => {
    if (!eventComplete || selectedTemplateId != null) return;
    const resolved = resolveAppliedFormatTemplateId({
      event: eventComplete,
      templates: formatTemplates,
      selectedTemplateId: null,
      persistedTemplateId: persistedFormatTemplateId,
    });
    if (resolved != null) {
      setSelectedTemplateId(resolved);
    }
  }, [
    eventComplete,
    formatTemplates,
    persistedFormatTemplateId,
    selectedTemplateId,
  ]);

  // Fetch event participants when the participants tab is active.
  const { data: participants, isLoading: loadingParticipants, error: participantsError } = useQuery({
    queryKey: ['eventParticipants', eventId],
    queryFn: () => EventsAPI.getEventParticipants(eventId),
    enabled:
      !!eventId &&
      activeTab === TabType.PARTICIPANTS &&
      directorAccessReady &&
      canParticipants,
    retry: false, // Don't retry on permission errors
    staleTime: 60 * 1000, // 1 min; mutations still invalidate/refetch immediately
    gcTime: 5 * 60 * 1000, // keep tab switches smooth; invalidation still refreshes when needed
  });
  
  useEffect(() => {
    const next = normalizeRoundsTabSearchParams(tabParam, searchParams);
    if (!next) return;
    setSearchParams(next, { replace: true });
  }, [tabParam, searchParams, setSearchParams]);

  useEffect(() => {
    const next = normalizeLegacyEventTabSearchParams(tabParam, searchParams);
    if (!next) return;
    setSearchParams(next, { replace: true });
  }, [tabParam, searchParams, setSearchParams]);

  useUnauthorizedEventTabRedirect({
    directorAccessReady,
    eventCompleteLoaded: Boolean(eventComplete),
    activeTab,
    canParticipants,
    canSquads,
    showLanesTab,
    canGameScoring,
    showFormatEditorTab,
    showStandingsTab,
    shellMode,
    setSearchParams,
  });

  // After lanes assignment/game scoring saves: refresh dependent event data.
  const handleAfterLanesOrScoringSave = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['eventChampionshipResults', eventId] });
    queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] });
    queryClient.invalidateQueries({ queryKey: ['roundMatchSeries'] });
    queryClient.invalidateQueries({ queryKey: ['highGameStandings'] });
    queryClient.invalidateQueries({ queryKey: ['highSetStandings'] });
    queryClient.invalidateQueries({ queryKey: ['eliminatorStandings'] });
    void invalidateEventFlowStructureQueries(queryClient, eventId);
  }, [eventId, queryClient]);

  // Handle participants refresh (TanStack Query only — no full page reload)
  const handleParticipantsRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] });
    queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
    queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event-teams', eventId] });
  };

  const signUpSinglesMutation = useMutation({
    mutationFn: async (opts?: { first_name?: string; last_name?: string; usbc_id?: string | null }) => {
      if (user) {
        return EventsAPI.registerForEventPublic({
          event_id: eventId,
          entry_number: 1,
          entry_fee_paid: false,
          notes: null,
        });
      }
      if (!opts?.first_name?.trim() || !opts?.last_name?.trim()) {
        throw new Error('First and last name are required.');
      }
      return EventsAPI.registerForEventPublic({
        event_id: eventId,
        first_name: opts.first_name.trim(),
        last_name: opts.last_name.trim(),
        usbc_id: opts.usbc_id?.trim() || null,
        entry_number: 1,
        entry_fee_paid: false,
        notes: null,
      });
    },
    onSuccess: () => {
      setPublicSinglesOpen(false);
      setPubFirstName('');
      setPubLastName('');
      setPubUsbc('');
      setSignUpBanner(
        'Your sign-up was submitted. The tournament director will review it before you appear on the roster.'
      );
      handleParticipantsRefresh();
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { error?: string; detail?: unknown } }; message?: string };
      const d = ax.response?.data;
      let msg = 'Sign-up failed.';
      if (typeof d?.error === 'string') msg = d.error;
      else if (typeof d?.detail === 'string') msg = d.detail;
      else if (ax.message) msg = ax.message;
      setSignUpBanner(msg);
    },
  });

  const handleDownloadParticipantsTemplate = async () => {
    setCsvUploadError(null);
    setCsvUploadMessage(null);
    try {
      const result = await downloadBlobFromLoader('participants_template.csv', () =>
        EventsAPI.downloadParticipantsCsvTemplate(eventId)
      );
      if (result.status === 'saved') {
        setCsvUploadAlertVariant('success');
        setCsvUploadMessage(`Template saved as ${result.filename}.`);
      }
    } catch (e) {
      console.error(e);
      setCsvUploadMessage(null);
      setCsvUploadError(
        e instanceof Error && e.message
          ? e.message
          : 'Could not download the CSV template.'
      );
    }
  };

  const handleParticipantsCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCsvUploading(true);
    setCsvUploadError(null);
    setCsvUploadMessage(null);
    try {
      const res = await EventsAPI.uploadParticipantsCsv(eventId, file);
      const lines: string[] = [res.message];
      if (res.errors?.length) {
        lines.push('', 'Not imported:', ...res.errors.map((e) => `• ${e}`));
      }
      if (res.warnings?.length) {
        lines.push('', 'Notes:', ...res.warnings.map((w) => `• ${w}`));
      }
      const fullText = lines.join('\n');
      const anythingCreated =
        (res.created_teams ?? 0) > 0 || (res.created_participants ?? 0) > 0;
      const hasIssues = (res.errors?.length ?? 0) > 0 || (res.warnings?.length ?? 0) > 0;

      if (!anythingCreated) {
        setCsvUploadError(fullText);
        setCsvUploadMessage(null);
      } else {
        setCsvUploadError(null);
        setCsvUploadMessage(fullText);
        setCsvUploadAlertVariant(hasIssues ? 'warning' : 'success');
      }

      queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-teams', eventId] });
      // Full page reload would clear this message; invalidateQueries refetches without that.
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { error?: string; message?: string; detail?: unknown } };
      };
      const d = ax.response?.data;
      let detailText = 'CSV upload failed.';
      if (typeof d?.error === 'string') {
        detailText = d.error;
      } else if (typeof d?.message === 'string') {
        detailText = d.message;
      } else if (typeof d?.detail === 'string') {
        detailText = d.detail;
      } else if (Array.isArray(d?.detail)) {
        detailText = (d.detail as { msg?: string }[])
          .map((x) => x.msg || JSON.stringify(x))
          .join('; ');
      }
      setCsvUploadError(detailText);
      setCsvUploadMessage(null);
    } finally {
      setCsvUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <Loading size="medium" />
      </div>
    );
  }
  
  if (error || !eventComplete) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    const detailPayload = isAxiosError(error) ? error.response?.data : undefined;
    const detailStr =
      detailPayload &&
      typeof detailPayload === 'object' &&
      'detail' in detailPayload &&
      typeof (detailPayload as { detail: unknown }).detail === 'string'
        ? (detailPayload as { detail: string }).detail
        : null;
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <Alert
          variant="error"
          message={
            status === 403
              ? detailStr || 'This event is not public yet.'
              : 'Error loading event details.'
          }
          className="mb-4"
        />
      </div>
    );
  }

  if (!eventComplete.tournament) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <Alert
          variant="error"
          message="Invalid event data: Missing tournament information."
          className="mb-4"
        />
      </div>
    );
  }

  const loadedSaOnly = isSaOnlyTournament(eventComplete.tournament);
  const shellRedirect = resolveEventDetailsShellRedirect({
    shellMode,
    tournament: eventComplete.tournament,
    eventId,
    layoutPrefix,
    user: user ?? null,
    search: location.search,
    getEventPath: (id) => roleAwareNav.getEventPath(id),
    getSaEventPath: (id) => roleAwareNav.getSaEventPath(id),
  });
  if (shellRedirect) {
    return <Navigate to={shellRedirect} replace />;
  }
  
  const { tournament } = eventComplete;
  const nowMs = Date.now();
  const eventStartMs = Date.parse(eventComplete.start_date);
  const flowRounds = Number.isNaN(eventStartMs)
    ? eventComplete.rounds
    : eventComplete.rounds.map((round) => {
        if (isPersistedRoundCompleted(round.status) && nowMs < eventStartMs) {
          return { ...round, status: 'scheduled' };
        }
        return round;
      });
  const scoringUnlocked = (eventComplete.rounds || []).some(
    (round) =>
      Boolean(round.locked_in) ||
      (round.squads || []).some((squad) => Boolean(squad.locked_in))
  );
  const scoringAllowedByStart =
    Number.isNaN(eventStartMs) || nowMs >= eventStartMs;
  const scoringUnlockedEffective = scoringUnlocked && scoringAllowedByStart;
  const hasOperationalProgress = hasEventOperationalProgress(eventComplete);

  // Define tabs — keep gated tabs mounted (disabled) while director access loads.
  const tabs: TabItem[] = buildEventDetailsTabsForShell({
    shellMode,
    canParticipants,
    canSquads,
    showLanesTab,
    canGameScoring,
    showFormatEditorTab,
    showStandingsTab,
    accessPending: isDirectorAccessPending,
  });
  
  const applySelectedFormat = (templateId: number | null) => {
    setApplyFormatError(null);
    setApplyFormatSuccess(null);
    setSelectedTemplateId(templateId);
    pendingFormatTemplateIdRef.current = templateId;
    if (shouldConfirmApplyEventFormat(eventComplete)) {
      setLoadFormatConfirmOpen(true);
      return;
    }
    applyFormatMutation.mutate({
      templateId,
      // Backend rejects apply when rounds exist unless replace is true; always replace
      // when applying a saved structure from this control (safe when the event is empty).
      replaceExistingStructure: true,
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Setup Error Alert */}
      {setupError && (
        <Alert
          variant="warning"
          message={setupError}
          onDismiss={() => setSetupError(null)}
          className="mb-6"
        />
      )}
      {signUpBanner && (
        <Alert
          variant={signUpBanner.includes('failed') || signUpBanner.includes('closed') ? 'error' : 'success'}
          message={signUpBanner}
          onDismiss={() => setSignUpBanner(null)}
          className="mb-6"
        />
      )}

      {/* Breadcrumb navigation — hidden for anonymous public /events/:id */}
      {!isMinimalPublicEventChrome && (
        <Breadcrumb
          items={buildEventDetailsBreadcrumbItems({
            shellMode,
            layoutPrefix,
            eventId,
            eventName: eventComplete.name,
            tournamentName: eventComplete.tournament?.name,
            tournamentId: eventComplete.tournament?.id,
          })}
        />
      )}
      
      {saOnly ? (
        <SaOnlyModeBanner
          tournamentId={eventComplete.tournament_id ?? eventComplete.tournament?.id ?? 0}
          eventId={eventId}
        />
      ) : tournamentIdForAccess > 0 ? (
        <TournamentAccessBanner tournamentId={tournamentIdForAccess} />
      ) : null}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
          <div>
            <PageTitle size="responsive" className="mb-1">{eventComplete.name}</PageTitle>
            <p className="text-text-muted text-sm sm:text-base">
              {formatDateNaive(eventComplete.start_date)} - {formatDateNaive(eventComplete.end_date)}
            </p>
          </div>
          
          <div className="flex mt-4 sm:mt-0 gap-2 flex-wrap justify-end">
            {canManageDelegation && (
              <>
                {!saOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    Share
                  </Button>
                )}
                {!saOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setDirectorPermissionsModalOpen(true)}
                  >
                    Assistant permissions
                  </Button>
                )}
              </>
            )}
            {!hideEventSignupCta && (
              <EventSignupCta
                eventComplete={eventComplete}
                tournament={tournament}
                eventFormat={eventComplete.event_format}
                user={user}
                singlesPending={signUpSinglesMutation.isPending}
                onSinglesClick={() => {
                  setSignUpBanner(null);
                  if (user) {
                    signUpSinglesMutation.mutate();
                  } else {
                    setPublicSinglesOpen(true);
                  }
                }}
                onTeamsClick={() => {
                  setSignUpBanner(null);
                  setIsTeamSignUpOpen(true);
                }}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs 
        activeTab={activeTab}
        tabs={tabs}
        onTabChange={handleTabChange}
        variant="underline"
        size="sm"
        ariaLabel="Event sections"
        idPrefix="event-sections"
        panelId="event-sections-panel"
      />
      
      {/* Tab Content */}
      <div
        id="event-sections-panel"
        role="tabpanel"
        aria-labelledby={`event-sections-tab-${activeTab}`}
      >
        {activeTab === TabType.INFO && !isSaDesk && (
          <div>
            {applyFormatError && (
              <Alert
                variant="error"
                message={applyFormatError}
                onDismiss={() => setApplyFormatError(null)}
                className="mb-4"
              />
            )}
            {applyFormatSuccess && (
              <Alert
                variant="success"
                message={applyFormatSuccess}
                onDismiss={() => setApplyFormatSuccess(null)}
                className="mb-4"
              />
            )}
            <div className="mb-4 flex flex-wrap justify-end gap-2">
              {canEditEventInfo && (
                <Button
                  type="button"
                  variant="lightbackground"
                  size="small"
                  onClick={openEventReports}
                  data-guide-id={GUIDE_IDS.EVENT_REPORTS}
                >
                  Reports
                </Button>
              )}
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main info column - spans 2/3 on large screens */}
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <AboutEventCard 
                eventComplete={eventComplete}
                isAuthorizedToEdit={canEditEventInfo}
                onSave={updateEventMutation.mutateAsync}
              />
              
              <EventRulesCard
                eventComplete={eventComplete}
                isAuthorizedToEdit={canEditEventInfo}
                onSave={updateEventMutation.mutateAsync}
              />

              {!saOnly && (
              <PrizePayoutInformationCard
                eventId={eventId}
                eventComplete={eventComplete}
                isAuthorizedToEdit={canEditEventInfo}
                onSave={updateEventMutation.mutateAsync}
              />
              )}

              <EventFormatCard
                eventComplete={eventComplete}
                isAuthorizedToEdit={canEditEventFormat && !saOnly}
                onSave={updateEventMutation.mutateAsync}
                onOpenFinalPayouts={
                  saOnly ? undefined : () => setFinalPayoutsOpen(true)
                }
                appliedStructureFormatLabel={appliedStructureFormatLabel}
              />

            {!saOnly && (
              <EventFlowPreview
                eventId={eventId}
                rounds={flowRounds}
                toolbar={
                  <>
                    {canManageFormatsOnInfoFlow && (
                      <select
                        className="min-w-[220px] rounded-md border border-border bg-surface px-2 py-1 text-sm"
                        value={
                          resolvedAppliedFormatTemplateId == null
                            ? ''
                            : String(resolvedAppliedFormatTemplateId)
                        }
                        onChange={(e) => {
                          const selected = e.target.value;
                          if (selected === '__create_new__') {
                            navigate(`${layoutPrefix || '/director'}/event-formats/wizard`);
                            return;
                          }
                          const parsed = selected === '' ? null : Number(selected);
                          applySelectedFormat(Number.isNaN(parsed as number) ? null : parsed);
                        }}
                        disabled={applyFormatMutation.isPending}
                        aria-label="Choose format"
                      >
                        <option value="">Choose format</option>
                        {formatTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                        <option value="__create_new__">Create new format</option>
                      </select>
                    )}
                    {canSaveFormatOnInfoFlow && (
                      <Button
                        type="button"
                        variant="icon"
                        size="small"
                        onClick={() => {
                          setApplyFormatError(null);
                          setApplyFormatSuccess(null);
                          setSaveFormatLibraryOpen(true);
                        }}
                        title={SAVE_FORMAT_TO_LIBRARY_BUTTON_LABEL}
                        aria-label={SAVE_FORMAT_TO_LIBRARY_BUTTON_LABEL}
                        className="p-1"
                      >
                        <SaveIcon className="w-5 h-5" />
                      </Button>
                    )}
                    {canManageFormatsOnInfoFlow && (
                      <Button
                        type="button"
                        variant="icon"
                        size="small"
                        title="Manage event formats"
                        aria-label="Manage event formats"
                        onClick={() =>
                          navigate(`${layoutPrefix || '/director'}/event-formats`)
                        }
                        className="p-1"
                      >
                        <TuneIcon className="w-5 h-5" />
                      </Button>
                    )}
                  </>
                }
                onRoundSelect={(rid) => setLiveScoresRoundId(rid)}
                onChampionshipSelect={(finalNodeId) => {
                  setSelectedFinalNodeId(finalNodeId);
                  setChampionshipResultsOpen(true);
                }}
              />
            )}
            </div>
            
            {/* Sidebar - 1/3 on large screens */}
            <div className="min-w-0 space-y-6">
              {canEditEventInfo && (
                <EventTdRegistrationSettingsCard
                  eventId={eventId}
                  event={eventComplete}
                  hidePublicVisibility={saOnly}
                />
              )}
              <EventDetailsCard
                eventComplete={eventComplete}
                isAuthorizedToEdit={canEditEventInfo}
                onSave={updateEventMutation.mutateAsync}
              />

              <EventReservedLanesCard
                eventComplete={eventComplete}
                isAuthorizedToEdit={canEditEventInfo}
                onSave={updateEventMutation.mutateAsync}
              />
              
              <HandicapInformationCard
                eventComplete={eventComplete}
                isAuthorizedToEdit={canEditEventInfo}
                onSave={updateEventMutation.mutateAsync}
              />
            </div>
            </div>
          </div>
        )}
        
        {activeTab === TabType.PARTICIPANTS && (
          <div>
            {(csvUploadError || csvUploadMessage) && !isDirectorAccessPending && canParticipants && (
              <div className="mb-4 space-y-2">
                {csvUploadError && (
                  <Alert
                    variant="error"
                    message={csvUploadError}
                    onDismiss={() => setCsvUploadError(null)}
                    className="whitespace-pre-line"
                  />
                )}
                {csvUploadMessage && (
                  <Alert
                    variant={csvUploadAlertVariant}
                    message={csvUploadMessage}
                    onDismiss={() => setCsvUploadMessage(null)}
                    className="whitespace-pre-line"
                  />
                )}
              </div>
            )}
            <div className="flex justify-between items-center mb-6">
              <div>
                <PageSectionHeading>Participant Management</PageSectionHeading>
                <p className="text-primary mt-1">Manage event participants and their registration status</p>
                {!isDirectorAccessPending && canParticipants && (
                  <>
                    <p className="text-sm text-text-muted mt-2 max-w-2xl">
                      CSV import: <code className="text-xs">usbc_id</code> may be left blank for new bowlers — a temporary
                      USBC (V-prefixed) is assigned, same as public sign-up. First and last name are required when USBC is
                      omitted. Optional columns <code className="text-xs">qualifying_average</code> and{' '}
                      <code className="text-xs">amount_paid</code> set this event&apos;s qualifying average and paid amount
                      (same as the Amount column in the table).
                    </p>
                    {eventComplete?.event_format === 'teams' && (
                      <p className="text-sm text-text-muted mt-1 max-w-2xl">
                        Team events: repeat <code className="text-xs">team_name</code> on every row for each team—including
                        blank placeholder rows for open roster spots (up to the event&apos;s team size per team). Unnamed rows
                        without <code className="text-xs">team_name</code> must form full teams only.
                      </p>
                    )}
                  </>
                )}
              </div>
              {!isDirectorAccessPending && canParticipants && (
                <div className="flex flex-wrap gap-2 justify-end">
                  <input
                    ref={participantsCsvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleParticipantsCsvFileChange}
                  />
                  <Button
                    variant="lightbackground"
                    onClick={() => void handleDownloadParticipantsTemplate()}
                    className="flex items-center"
                    disabled={csvUploading}
                  >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Download template
                  </Button>
                  <Button
                    variant="lightbackground"
                    onClick={() => participantsCsvInputRef.current?.click()}
                    className="flex items-center"
                    disabled={csvUploading}
                  >
                    <UploadFileIcon className="w-5 h-5 mr-2" />
                    {csvUploading ? 'Uploading…' : 'Upload CSV'}
                  </Button>
                  {eventComplete?.event_format === 'singles' && (
                    <Button
                      variant="lightbackground"
                      onClick={() => setShowBatchAddParticipantsModal(true)}
                      className="flex items-center"
                      data-guide-id={GUIDE_IDS.ADD_PARTICIPANTS}
                    >
                      <PersonAddIcon className="w-5 h-5 mr-2" />
                      Add Participants
                    </Button>
                  )}
                  {eventComplete?.event_format === 'teams' && (
                    <Button
                      variant="lightbackground"
                      onClick={() => setShowBatchAddTeamMembersModal(true)}
                      className="flex items-center"
                    >
                      <GroupAddIcon className="w-5 h-5 mr-2" />
                      Add Teams
                    </Button>
                  )}
                </div>
              )}
            </div>

            {isDirectorAccessPending && (
              <div className="flex justify-center py-16">
                <Loading size="large" />
              </div>
            )}

            {!isDirectorAccessPending && !canParticipants && (
              <Alert
                variant="warning"
                message="You do not have permission to manage participants for this event."
                className="mb-4"
              />
            )}

            {!isDirectorAccessPending && canParticipants && participantsError && (
              <Alert variant="error" message="Failed to load participants. Please try again." />
            )}

            {!isDirectorAccessPending && canParticipants && !participantsError && (
              <ParticipantManagementTable
                eventId={eventId}
                tournamentId={eventComplete.tournament_id}
                participants={(participants || []) as EventParticipantWithUser[]}
                event={{
                  team_size: eventComplete.team_size || undefined,
                  event_format: eventComplete.event_format,
                  entry_fee: eventComplete.entry_fee || undefined,
                  start_date: eventComplete.start_date,
                }}
                isLoading={loadingParticipants}
                canManageLanes={canLanes}
                defaultManagementMode={isSaDesk ? 'side_actions' : 'participants'}
                hideManagementModeToggle={isSaDesk}
              />
            )}
          </div>
        )}
        
        {activeTab === TabType.SQUADS && canSquads && (
          <div>
            <SquadsTab
              eventId={eventId}
              eventComplete={eventComplete}
              isAuthorizedForManagement={canSquads}
              onAfterSuccessfulSave={handleAfterLanesOrScoringSave}
            />
          </div>
        )}

        {activeTab === TabType.LANE_ASSIGNMENT && showLanesTab && (
          <LaneAssignmentPanel
            eventId={eventId}
            initialRoundId={eventComplete?.rounds?.[0]?.id ?? null}
            rounds={(eventComplete?.rounds || []).map((round) => ({
              id: round.id,
              round_number: round.round_number,
              friendly_name: round.friendly_name,
              competition_method_config: round.competition_method_config ?? null,
            }))}
            eventFormat={eventComplete?.event_format}
            teamSize={eventComplete?.team_size}
            onAfterSuccessfulSave={handleAfterLanesOrScoringSave}
          />
        )}

        {activeTab === TabType.GAME_SCORING && canGameScoring && (
          <GameScoringTab 
            eventId={eventId}
            eventComplete={eventComplete}
            isAuthorizedForManagement={canGameScoring && scoringAllowedByStart}
            scoringUnlocked={scoringUnlockedEffective}
            scoringBlockedUntilStart={!scoringAllowedByStart}
            onAfterSuccessfulSave={handleAfterLanesOrScoringSave}
            isSaOnly={saOnly}
          />
        )}

        {activeTab === TabType.GAME_SCORING && !canGameScoring && isDirectorAccessPending && (
          <div className="flex justify-center py-16">
            <Loading size="large" />
          </div>
        )}

        {activeTab === TabType.FORMAT_EDITOR && showFormatEditorTab && eventComplete && (
          <EventFormatEditorTab
            eventId={eventId}
            eventComplete={eventComplete}
            relationships={roundRelationships as unknown as Record<string, unknown>[]}
          />
        )}

        {activeTab === TabType.STANDINGS && showStandingsTab && eventComplete && (
          <EventStandingsPanel
            eventId={eventId}
            tournamentId={eventComplete.tournament_id ?? eventComplete.tournament?.id ?? 0}
            eventName={eventComplete.name}
            eventFormat={String(eventComplete.event_format || '')}
            rounds={(eventComplete.rounds || []).map((round) => ({
              id: round.id,
              round_number: round.round_number,
              friendly_name: round.friendly_name,
              competition_method_config: round.competition_method_config ?? null,
            }))}
            squads={(eventComplete.rounds || []).flatMap((round) =>
              (round.squads || []).map((squad) => ({
                id: squad.id,
                name: squad.name || `Squad ${squad.id}`,
                round_id: round.id,
              }))
            )}
            defaultIncludeHandicap={(eventComplete.handicap_percentage ?? 0) > 0}
          />
        )}

        {activeTab === TabType.SIDE_ACTIONS && eventComplete && (
          <EventSideActionsPanel
            tournamentId={eventComplete.tournament_id ?? eventComplete.tournament?.id ?? 0}
            eventId={eventId}
            eventName={eventComplete.name}
            eventGameCount={Math.max(
              1,
              ...(eventComplete.rounds || []).flatMap((round) => {
                const squadCounts = (round.squads || []).map((s) => s.game_count ?? 0);
                return [round.game_count ?? 0, ...squadCounts];
              })
            )}
            eventHandicap={{
              base_score: eventComplete.handicap_base_score,
              percentage: eventComplete.handicap_percentage,
            }}
            allowTeamEntry={eventComplete.event_format === EventFormat.TEAMS}
            participantsTabPath={`${layoutPrefix}/events/${eventId}`}
            rounds={(eventComplete.rounds || []).map((round) => ({
              id: round.id,
              round_number: round.round_number,
              friendly_name: round.friendly_name,
              game_count: round.game_count,
              squads: (round.squads || []).map((squad) => ({
                id: squad.id,
                name: squad.name || `Squad ${squad.id}`,
                game_count: squad.game_count ?? round.game_count,
              })),
            }))}
          />
        )}
      </div>
      <EventDetailsModals
        eventId={eventId}
        eventComplete={eventComplete}
        participantUserIds={participants?.map((p) => p.user_id) || []}
        userId={user?.id}
        canEditEventInfo={canEditEventInfo}
        canRecomputeChampionship={canRecomputeChampionship}
        hasOperationalProgress={hasOperationalProgress}
        formatTemplates={formatTemplates}
        showAddParticipantsModal={showAddParticipantsModal}
        onCloseAddParticipants={() => setShowAddParticipantsModal(false)}
        showBatchAddParticipantsModal={showBatchAddParticipantsModal}
        onCloseBatchAddParticipants={() => setShowBatchAddParticipantsModal(false)}
        showBatchAddTeamMembersModal={showBatchAddTeamMembersModal}
        onCloseBatchAddTeamMembers={() => setShowBatchAddTeamMembersModal(false)}
        showQuickTeamRegistrationModal={showQuickTeamRegistrationModal}
        onCloseQuickTeamRegistration={() => setShowQuickTeamRegistrationModal(false)}
        onParticipantsRefresh={handleParticipantsRefresh}
        publicSinglesOpen={publicSinglesOpen}
        onClosePublicSingles={() => setPublicSinglesOpen(false)}
        pubFirstName={pubFirstName}
        onPubFirstNameChange={setPubFirstName}
        pubLastName={pubLastName}
        onPubLastNameChange={setPubLastName}
        pubUsbc={pubUsbc}
        onPubUsbcChange={setPubUsbc}
        onSubmitPublicSingles={() =>
          signUpSinglesMutation.mutate({
            first_name: pubFirstName,
            last_name: pubLastName,
            usbc_id: pubUsbc || null,
          })
        }
        publicSinglesPending={signUpSinglesMutation.isPending}
        isTeamSignUpOpen={isTeamSignUpOpen}
        onCloseTeamSignUp={() => setIsTeamSignUpOpen(false)}
        onTeamSignUpRegistered={() => {
          setIsTeamSignUpOpen(false);
          setSignUpBanner(
            'Your team sign-up was submitted. The tournament director will review it before your team appears on the roster.'
          );
          handleParticipantsRefresh();
        }}
        saveFormatLibraryOpen={saveFormatLibraryOpen}
        onCloseSaveFormatLibrary={() => setSaveFormatLibraryOpen(false)}
        onFormatLibrarySaved={(message) => setApplyFormatSuccess(message)}
        isShareModalOpen={isShareModalOpen}
        onCloseShareModal={() => setIsShareModalOpen(false)}
        directorPermissionsModalOpen={directorPermissionsModalOpen}
        onCloseDirectorPermissions={() => setDirectorPermissionsModalOpen(false)}
        liveScoresRoundId={liveScoresRoundId}
        onCloseLiveScores={() => setLiveScoresRoundId(null)}
        championshipResultsOpen={championshipResultsOpen}
        selectedFinalNodeId={selectedFinalNodeId}
        onCloseChampionshipResults={() => {
          setChampionshipResultsOpen(false);
          setSelectedFinalNodeId(null);
        }}
        finalPayoutsOpen={finalPayoutsOpen}
        onCloseFinalPayouts={() => setFinalPayoutsOpen(false)}
        eventReportsOpen={eventReportsOpen}
        onCloseEventReports={() => setEventReportsOpen(false)}
        loadFormatConfirmOpen={loadFormatConfirmOpen}
        onCloseLoadFormatConfirm={() => setLoadFormatConfirmOpen(false)}
        onConfirmApplyFormat={() => {
          setLoadFormatConfirmOpen(false);
          applyFormatMutation.mutate({
            templateId: pendingFormatTemplateIdRef.current,
            replaceExistingStructure: true,
          });
        }}
      />
    </div>
  );
};

export default EventDetails; 
