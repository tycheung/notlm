import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { canCreateFullTournament } from '../../api/tdAccess';
import { BowlingCentersAPI } from '../../api/bowling-centers';
import { EventsAPI } from '../../api/events';
import { DirectorsAPI } from '../../api/directors';
import { SideActionsAPI } from '../../api/side-actions';
import { isSaOnlyRole } from '../../utils/roles';
import { isSaOnlyTournament } from '../../utils/saOnly';
import {
  loadTournamentCreateDraft,
  saveTournamentCreateDraft,
} from '../../utils/tournamentCreateDraftStorage';
import {
  loadEventCreateDraft,
  mergeEventCreateDraft,
} from '../../utils/eventCreateDraftStorage';
import { EventFormat } from '../../types/event';
import { GUIDE_IDS } from './guideIds';
import { diagnoseScoringBlockers, siblingNextActions } from './blockers';
import { evaluateFlowStatuses, nextAvailableSteps } from './flowStatus';
import { flashGuideField } from './fieldFlash';
import { fuzzyMatchCenterName } from './intents';
import {
  coachFillAndSubmit,
  getMissingRequiredFill,
  listMissingRequiredFills,
} from './missingRequired';
import { getNavSkip } from './navSkipRegistry';
import { DATA_POINT_LEXICON, matchDataPoint } from './dataPointLexicon';
import {
  resolveParticipantOrAmbiguous,
  type NamedParticipant,
} from './participantResolve';
import { dispatchUserUtterance } from './dispatchUserUtterance';
import { shouldSkipLaunchSpotlight } from './skipLaunchCoach';
import { writeFormatDraftToWizardStorage } from './formatGuideOps';
import { eventFormatTemplatesApi } from '../../api/eventFormatTemplates';
import {
  completeQueueHead,
  emptySessionSlots,
  clearStale,
  markReportsOpened,
  markSideActionsSkipped,
  type GuideSessionSlots,
} from './slots';
import SpotlightOverlay from './SpotlightOverlay';
import { useSpotlightController } from './useSpotlightController';
import type {
  ChatMessage,
  GuideModalKey,
  GuideRuntimeContext,
  GuideSlotBag,
  GuideStepId,
  GuideStepStatus,
} from './types';

type ExecuteStepOpts = {
  prefill?: GuideSlotBag;
  skipCoach?: boolean;
  flashFieldId?: string;
  flashFieldIds?: string[];
  /** When true, after open coach fill+submit from missing fields. */
  coachCreate?: boolean;
  /** Prefer these ids when React focus state has not caught up yet (queue advance). */
  contextOverride?: { tournamentId?: number; eventId?: number };
  /** Participant lookups should open the screen even if checklist deps are incomplete. */
  bypassAvailability?: boolean;
};

type DirectorGuideValue = {
  ctx: GuideRuntimeContext;
  statuses: GuideStepStatus[];
  nextSteps: GuideStepStatus[];
  session: GuideSessionSlots;
  pendingModal: GuideModalKey | null;
  clearPendingModal: () => void;
  requestOpenModal: (key: GuideModalKey) => void;
  executeStep: (stepId: GuideStepId, opts?: ExecuteStepOpts) => void;
  notifyStepCompleted: (
    stepId: GuideStepId,
    ids?: { tournamentId?: number; eventId?: number }
  ) => void;
  skipSideActions: () => void;
  markReportsSeen: () => void;
  setFocusTournament: (id: number | null) => void;
  setFocusEvent: (id: number | null) => void;
  messages: ChatMessage[];
  pushAssistant: (text: string) => void;
  handleUserUtterance: (text: string) => void;
  confirmParticipantChoice: (index: number) => void;
  scoringBlockers: ReturnType<typeof diagnoseScoringBlockers>;
  siblingSteps: GuideStepId[];
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
};

function dataPointFromKey(key: string | null) {
  if (!key) return null;
  return DATA_POINT_LEXICON.find((e) => e.key === key) ?? null;
}

const DirectorGuideContext = createContext<DirectorGuideValue | null>(null);

function parseIdsFromPath(pathname: string): {
  tournamentId: number | null;
  eventId: number | null;
} {
  const tournamentMatch = pathname.match(/\/tournaments\/(\d+)/);
  const eventMatch = pathname.match(/\/(?:events|side-actions\/events)\/(\d+)/);
  return {
    tournamentId: tournamentMatch ? Number(tournamentMatch[1]) : null,
    eventId: eventMatch ? Number(eventMatch[1]) : null,
  };
}

function newMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, text, at: Date.now() };
}

export const DirectorGuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const layoutPrefix: '/director' | '/admin' = location.pathname.startsWith('/admin')
    ? '/admin'
    : '/director';

  const routeIds = parseIdsFromPath(location.pathname);
  const [focusTournamentId, setFocusTournament] = useState<number | null>(null);
  const [focusEventId, setFocusEvent] = useState<number | null>(null);
  const [session, setSession] = useState<GuideSessionSlots>(() => emptySessionSlots());
  const sessionRef = React.useRef(session);
  sessionRef.current = session;
  const [pendingModal, setPendingModal] = useState<GuideModalKey | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    newMessage(
      'assistant',
      'How can I help you today? I can help you create and set up tournaments and events.'
    ),
  ]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { spotlight, showSpotlight, clearSpotlight } = useSpotlightController();

  useEffect(() => {
    if (routeIds.tournamentId != null) setFocusTournament(routeIds.tournamentId);
    if (routeIds.eventId != null) setFocusEvent(routeIds.eventId);
  }, [routeIds.tournamentId, routeIds.eventId]);

  const tournamentId = focusTournamentId ?? routeIds.tournamentId;
  const eventId = focusEventId ?? routeIds.eventId;

  const { data: centers = [] } = useQuery({
    queryKey: ['bowlingCenters', 'guide'],
    queryFn: () => BowlingCentersAPI.getBowlingCenters(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const { data: myTournaments = [] } = useQuery({
    queryKey: ['guide', 'myTournaments'],
    queryFn: () => DirectorsAPI.getMyTournaments(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const { data: tournamentEvents = [] } = useQuery({
    queryKey: ['guide', 'tournamentEvents', tournamentId],
    queryFn: () => EventsAPI.getEvents({ tournament_id: tournamentId! }),
    enabled: Boolean(user) && tournamentId != null,
    staleTime: 30_000,
  });

  const { data: eventComplete = null } = useQuery({
    queryKey: ['eventComplete', eventId],
    queryFn: () => EventsAPI.getCompleteEvent(eventId!),
    enabled: Boolean(user) && eventId != null,
    staleTime: 15_000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['eventParticipants', eventId],
    queryFn: () => EventsAPI.getEventParticipants(eventId!),
    enabled: Boolean(user) && eventId != null,
    staleTime: 15_000,
  });

  const sideActionsTournamentId =
    tournamentId ?? eventComplete?.tournament_id ?? eventComplete?.tournament?.id ?? null;

  const { data: sideActions = [] } = useQuery({
    queryKey: ['guide', 'sideActions', eventId, sideActionsTournamentId],
    queryFn: () =>
      SideActionsAPI.getSideActions({
        event_id: eventId!,
        tournament_id: sideActionsTournamentId!,
      }),
    enabled: Boolean(user) && eventId != null && sideActionsTournamentId != null,
    staleTime: 15_000,
  });

  const { data: saLockStatus } = useQuery({
    queryKey: ['guide', 'saLockStatus', eventId],
    queryFn: () => SideActionsAPI.getEventLockStatus(eventId!),
    enabled: Boolean(user) && eventId != null,
    staleTime: 15_000,
  });

  const saOnlyMode =
    isSaOnlyRole(user?.role) || isSaOnlyTournament(eventComplete?.tournament ?? null);

  const approvedParticipantCount = participants.filter(
    (p) => String(p.status || '').toLowerCase() === 'approved'
  ).length;

  let squadParticipantCount = 0;
  let lockedSquadCount = 0;
  let lanesAssignedCount = 0;
  let scoredGameCount = 0;
  let completedRoundCount = 0;

  for (const round of eventComplete?.rounds || []) {
    if (String(round.status || '').toLowerCase() === 'completed') completedRoundCount += 1;
    if (round.locked_in) lockedSquadCount += 1;
    for (const squad of round.squads || []) {
      if (squad.locked_in) lockedSquadCount += 1;
      const sps = (squad as { squad_participants?: Array<{ assigned_lane?: number | null }> })
        .squad_participants;
      if (Array.isArray(sps)) {
        squadParticipantCount += sps.length;
        lanesAssignedCount += sps.filter((sp) => sp.assigned_lane != null).length;
      }
      const games = (squad as { games?: Array<{ score?: number | null }> }).games;
      if (Array.isArray(games)) {
        scoredGameCount += games.filter((g) => g.score != null && Number(g.score) >= 0).length;
      }
    }
  }

  // Fallback: participant assignment counts from event participants if squad embeds missing
  if (squadParticipantCount === 0) {
    squadParticipantCount = participants.filter((p) => {
      const any = p as { squad_id?: number | null; assigned_squad_id?: number | null };
      return any.squad_id != null || any.assigned_squad_id != null;
    }).length;
  }

  const hasLockGatedSideActions = (saLockStatus?.active_count ?? 0) > 0;
  const sideActionEntriesLocked =
    !hasLockGatedSideActions || Boolean(saLockStatus?.all_locked);

  const ctx: GuideRuntimeContext = useMemo(
    () => ({
      layoutPrefix,
      user,
      pathname: location.pathname,
      tournamentId,
      eventId,
      canCreateTournament: canCreateFullTournament(user?.billing) || saOnlyMode,
      bowlingCenterCount: Array.isArray(centers) ? centers.length : 0,
      tournamentCount: Array.isArray(myTournaments) ? myTournaments.length : 0,
      eventCountForTournament: Array.isArray(tournamentEvents) ? tournamentEvents.length : 0,
      eventComplete,
      approvedParticipantCount,
      squadParticipantCount,
      lockedSquadCount,
      lanesAssignedCount,
      scoredGameCount,
      sideActionCount: Array.isArray(sideActions) ? sideActions.length : 0,
      sideActionEntriesLocked,
      hasLockGatedSideActions,
      skippedSideActions: session.skippedSideActions,
      completedRoundCount,
      reportsOpened: session.reportsOpened,
      saOnlyMode,
    }),
    [
      layoutPrefix,
      user,
      location.pathname,
      tournamentId,
      eventId,
      saOnlyMode,
      centers,
      myTournaments,
      tournamentEvents,
      eventComplete,
      approvedParticipantCount,
      squadParticipantCount,
      lockedSquadCount,
      lanesAssignedCount,
      scoredGameCount,
      sideActions,
      sideActionEntriesLocked,
      hasLockGatedSideActions,
      session.skippedSideActions,
      session.reportsOpened,
      completedRoundCount,
      saLockStatus,
    ]
  );

  const staleSet = useMemo(() => new Set(session.stale), [session.stale]);
  const statuses = useMemo(() => evaluateFlowStatuses(ctx, staleSet), [ctx, staleSet]);
  const nextSteps = useMemo(() => nextAvailableSteps(statuses), [statuses]);
  const scoringBlockers = useMemo(() => diagnoseScoringBlockers(ctx), [ctx]);
  const siblingSteps = useMemo(() => siblingNextActions(ctx), [ctx]);

  const clearPendingModal = useCallback(() => setPendingModal(null), []);
  const requestOpenModal = useCallback((key: GuideModalKey) => setPendingModal(key), []);

  const applyPrefill = useCallback(
    (
      stepId: GuideStepId,
      prefill: GuideSlotBag | undefined,
      opts?: { tournamentIdOverride?: number | null }
    ) => {
      if (!prefill || Object.keys(prefill).length === 0) return;

      if (stepId === 'create_tournament') {
        const existing = loadTournamentCreateDraft();
        const base = existing?.formValues || {
          name: '',
          start_date: null,
          end_date: null,
          official_flg: false,
          bowling_center_id: null,
          description: '',
          rules: '',
          organizer_id: user?.id || null,
          location: '',
          lanes_reserved: 8,
        };
        const next = { ...base };
        if (typeof prefill.name === 'string') next.name = prefill.name;
        if (typeof prefill.lanes_reserved === 'number') next.lanes_reserved = prefill.lanes_reserved;
        if (typeof prefill.bowling_center_id === 'number') {
          next.bowling_center_id = prefill.bowling_center_id;
        } else if (typeof prefill.bowling_center_hint === 'string') {
          const match = fuzzyMatchCenterName(
            prefill.bowling_center_hint,
            (centers || []).map((c) => ({ id: c.id, name: c.name }))
          );
          if (match) {
            next.bowling_center_id = match.id;
            next.location = match.name;
          }
        }
        saveTournamentCreateDraft({
          v: 1,
          formValues: next as typeof base,
          startDateTime: existing?.startDateTime ?? null,
          endDateTime: existing?.endDateTime ?? null,
          isEndTimeAutoCalculated: existing?.isEndTimeAutoCalculated ?? true,
        });
      }

      const eventTournamentId = opts?.tournamentIdOverride ?? tournamentId;
      if (stepId === 'create_event' && eventTournamentId != null) {
        const existing = loadEventCreateDraft(eventTournamentId);
        const formValues: Record<string, unknown> = { ...(existing?.formValues || {}) };
        if (typeof prefill.name === 'string') formValues.name = prefill.name;
        if (typeof prefill.start_date === 'string') formValues.start_date = prefill.start_date;
        if (typeof prefill.end_date === 'string') formValues.end_date = prefill.end_date;
        if (prefill.allows_reentry === true || prefill.allows_reentry === false) {
          formValues.allows_reentry = prefill.allows_reentry;
        }
        if (prefill.event_format === 'teams' || prefill.event_format === EventFormat.TEAMS) {
          formValues.event_format = EventFormat.TEAMS;
        } else if (prefill.event_format === 'singles' || prefill.event_format === EventFormat.SINGLES) {
          formValues.event_format = EventFormat.SINGLES;
        }
        mergeEventCreateDraft(eventTournamentId, { formValues });
      }

      if (stepId === 'apply_format' && user?.id) {
        const draft = prefill.formatDraft as import('../../constants/defaultEventStructurePayload').EventStructurePayload | undefined;
        if (draft && Array.isArray(draft.rounds)) {
          writeFormatDraftToWizardStorage(user.id, draft);
        }
        const matchedId =
          typeof prefill.matchedTemplateId === 'number' ? prefill.matchedTemplateId : null;
        if (matchedId != null) {
          void eventFormatTemplatesApi.list().then((list) => {
            const t = list.find((x) => x.id === matchedId);
            if (t?.payload && user?.id) {
              writeFormatDraftToWizardStorage(user.id, t.payload as import('../../constants/defaultEventStructurePayload').EventStructurePayload);
            }
          });
        }
      }
    },
    [centers, tournamentId, user?.id]
  );

  const flashFields = useCallback((ids: string[]) => {
    ids.forEach((id, i) => {
      window.setTimeout(() => flashGuideField(id), 200 + i * 750);
    });
    if (ids[0]) {
      setSession((s) => ({ ...s, lastFlashedGuideId: ids[0] }));
    }
  }, []);

  const executeStep = useCallback(
    (stepId: GuideStepId, opts?: ExecuteStepOpts) => {
      const skip = getNavSkip(stepId);
      if (!skip) return;

      const effectiveCtx: GuideRuntimeContext = {
        ...ctx,
        tournamentId: opts?.contextOverride?.tournamentId ?? ctx.tournamentId,
        eventId: opts?.contextOverride?.eventId ?? ctx.eventId,
      };

      const reason = skip.unavailableReason(effectiveCtx);
      if (!opts?.bypassAvailability && reason && !skip.isAvailable(effectiveCtx)) {
        setMessages((prev) => [...prev, newMessage('assistant', reason)]);
        return;
      }

      const slots = session.byStep[stepId] || {};
      const mergedPrefill = { ...slots, ...(opts?.prefill || {}) };
      applyPrefill(stepId, mergedPrefill, {
        tournamentIdOverride: effectiveCtx.tournamentId,
      });

      const resolved = skip.resolve(effectiveCtx);
      if (resolved.prefill) {
        applyPrefill(stepId, resolved.prefill, {
          tournamentIdOverride: effectiveCtx.tournamentId,
        });
      }

      setSession((s) => ({
        ...s,
        activeStep: stepId,
        history: s.history[s.history.length - 1] === stepId ? s.history : [...s.history, stepId],
        stale: clearStale(s, stepId).stale,
      }));

      const target =
        resolved.search != null ? `${resolved.path}${resolved.search}` : resolved.path;
      const here = `${location.pathname}${location.search}`;
      const alreadySkipLaunch = shouldSkipLaunchSpotlight(stepId, resolved, here);

      if (target !== here) {
        navigate(target);
      }

      if (resolved.openModal) {
        window.setTimeout(() => setPendingModal(resolved.openModal!), alreadySkipLaunch ? 0 : 50);
      }

      if (stepId === 'run_reports') {
        setSession((s) => markReportsOpened(s));
      }

      const skipCoach =
        Boolean(opts?.skipCoach) ||
        alreadySkipLaunch ||
        Boolean(resolved.openModal) ||
        Boolean(opts?.coachCreate);
      if (!skipCoach) {
        const message =
          resolved.coachMessage ||
          `Opening ${skip.title}. Use the highlighted control on screen.`;
        if (resolved.spotlight) {
          window.setTimeout(() => showSpotlight(resolved.spotlight!, message), 120);
        }
      }

      const flashIds =
        opts?.flashFieldIds ||
        (opts?.flashFieldId ? [opts.flashFieldId] : []);
      if (flashIds.length) {
        window.setTimeout(() => flashFields(flashIds), alreadySkipLaunch ? 80 : 300);
      }

      if (opts?.coachCreate) {
        window.setTimeout(() => {
          setSession((s) => {
            const missing = listMissingRequiredFills(stepId, s, {
              tournamentId: effectiveCtx.tournamentId,
            });
            const coach = coachFillAndSubmit(stepId, missing);
            setMessages((prev) => [...prev, newMessage('assistant', coach.message)]);
            window.setTimeout(() => flashFields(coach.flashIds), 50);
            return { ...s, lastFlashedGuideId: coach.flashIds[0] || s.lastFlashedGuideId };
          });
        }, 400);
      }
    },
    [
      applyPrefill,
      ctx,
      flashFields,
      location.pathname,
      location.search,
      navigate,
      session.byStep,
      showSpotlight,
    ]
  );

  const executeStepRef = React.useRef(executeStep);
  executeStepRef.current = executeStep;

  const pushAssistant = useCallback((text: string) => {
    setMessages((prev) => [...prev, newMessage('assistant', text)]);
  }, []);

  const openQueuedHead = useCallback(
    (queueSession: GuideSessionSlots, announce?: string) => {
      const head = queueSession.actionQueue[0];
      if (!head) return;
      if (announce) pushAssistant(announce);
      executeStep(head.stepId, {
        prefill: head.slots,
        skipCoach: true,
        coachCreate:
          head.stepId === 'create_tournament' ||
          head.stepId === 'create_event' ||
          head.stepId === 'apply_format',
      });
    },
    [executeStep, pushAssistant]
  );

  const notifyStepCompleted = useCallback(
    (stepId: GuideStepId, ids?: { tournamentId?: number; eventId?: number }) => {
      if (ids?.tournamentId != null) setFocusTournament(ids.tournamentId);
      if (ids?.eventId != null) setFocusEvent(ids.eventId);

      setSession((s) => {
        const next = completeQueueHead(s, stepId);
        const head = next.actionQueue[0];
        if (head) {
          window.setTimeout(() => {
            pushAssistant(
              `Saved. Continuing with “${getNavSkip(head.stepId)?.title || head.stepId}”.`
            );
            executeStepRef.current(head.stepId, {
              prefill: head.slots,
              skipCoach: true,
              coachCreate:
          head.stepId === 'create_tournament' ||
          head.stepId === 'create_event' ||
          head.stepId === 'apply_format',
              contextOverride: {
                tournamentId: ids?.tournamentId,
                eventId: ids?.eventId,
              },
            });
          }, 500);
        } else {
          window.setTimeout(() => pushAssistant('Queue complete for now.'), 200);
        }
        return next;
      });
    },
    [pushAssistant]
  );

  const namedParticipants = useMemo((): NamedParticipant[] => {
    return (participants || []).map((p) => {
      const withUser = p as {
        id: number;
        user_id?: number;
        user_name?: string;
        user?: { id?: number; first_name?: string; last_name?: string; name?: string };
      };
      const u = withUser.user;
      const displayName =
        (typeof withUser.user_name === 'string' && withUser.user_name.trim()) ||
        u?.name ||
        [u?.first_name, u?.last_name].filter(Boolean).join(' ') ||
        `Participant ${p.id}`;
      return {
        id: p.id,
        userId: u?.id ?? withUser.user_id ?? p.id,
        displayName,
      };
    });
  }, [participants]);

  const runParticipantLookup = useCallback(
    (
      personHint: string,
      dataKey: ReturnType<typeof matchDataPoint> | null,
      opts?: { eventSwitchName?: string | null }
    ) => {
      if (opts?.eventSwitchName && Array.isArray(tournamentEvents)) {
        const q = opts.eventSwitchName.toLowerCase();
        const hit = tournamentEvents.find((e) =>
          String((e as { name?: string }).name || '')
            .toLowerCase()
            .includes(q)
        );
        if (hit) {
          setFocusEvent(hit.id);
          pushAssistant(`Switching to event “${(hit as { name?: string }).name || hit.id}”.`);
          // Re-run after React Query refetches participants for the new eventId.
          const attempt = (opts as { _attempt?: number })._attempt ?? 0;
          window.setTimeout(() => {
            runParticipantLookup(personHint, dataKey, {
              ...opts,
              eventSwitchName: null,
              _attempt: attempt + 1,
            } as typeof opts & { _attempt?: number });
          }, attempt === 0 ? 400 : 700);
          return;
        }
        pushAssistant(`I couldn't find an event matching “${opts.eventSwitchName}”.`);
        return;
      }

      if (namedParticipants.length === 0) {
        const attempt = (opts as { _attempt?: number } | undefined)?._attempt ?? 0;
        if (attempt < 3) {
          window.setTimeout(() => {
            runParticipantLookup(personHint, dataKey, {
              ...(opts || {}),
              _attempt: attempt + 1,
            } as typeof opts & { _attempt?: number });
          }, 350);
          return;
        }
      }

      const { clear, ambiguous } = resolveParticipantOrAmbiguous(personHint, namedParticipants);
      if (ambiguous.length) {
        setSession((s) => ({
          ...s,
          pendingParticipantResolve: {
            query: personHint,
            candidates: ambiguous,
            dataPointKey: dataKey?.key ?? null,
          },
        }));
        const lines = ambiguous
          .map((c, i) => `${i + 1}. ${c.displayName}`)
          .join('\n');
        pushAssistant(
          `I found a few close matches for “${personHint}”. Reply with a number to confirm:\n${lines}`
        );
        return;
      }
      if (!clear) {
        pushAssistant(`I couldn't find anyone matching “${personHint}” in this event.`);
        return;
      }

      setSession((s) => ({
        ...s,
        lastResolvedParticipant: clear,
        pendingParticipantResolve: null,
      }));

      const point = dataKey;
      const stepId = point?.stepId || 'advance_rounds';
      const rowId = `${GUIDE_IDS.PARTICIPANT_ROW_PREFIX}${clear.id}`;
      pushAssistant(
        `Opening where you can see ${clear.displayName}. ${point?.coachMessage || ''}`.trim()
      );
      executeStep(stepId, {
        skipCoach: true,
        flashFieldIds: [point?.spotlight, rowId].filter(Boolean) as string[],
        bypassAvailability: true,
      });
    },
    [executeStep, namedParticipants, pushAssistant, tournamentEvents]
  );

  const confirmParticipantChoice = useCallback(
    (index: number) => {
      const pending = sessionRef.current.pendingParticipantResolve;
      if (!pending || index < 0 || index >= pending.candidates.length) {
        pushAssistant('Reply with the number of the bowler you meant.');
        return;
      }
      const chosen = pending.candidates[index];
      setSession((s) => ({
        ...s,
        lastResolvedParticipant: chosen,
        pendingParticipantResolve: null,
      }));
      const point =
        dataPointFromKey(pending.dataPointKey) || matchDataPoint(pending.query);
      const rowId = `${GUIDE_IDS.PARTICIPANT_ROW_PREFIX}${chosen.id}`;
      pushAssistant(
        `Got it — ${chosen.displayName}. ${point?.coachMessage || 'Opening that screen.'}`
      );
      executeStep(point?.stepId || 'advance_rounds', {
        skipCoach: true,
        flashFieldIds: [point?.spotlight, rowId].filter(Boolean) as string[],
        bypassAvailability: true,
      });
    },
    [executeStep, pushAssistant]
  );

  const handleUserUtterance = useCallback(
    (text: string) => {
      dispatchUserUtterance({
        text,
        location: { pathname: location.pathname, search: location.search },
        ctx,
        statuses,
        nextSteps,
        siblingSteps,
        scoringBlockers,
        messages,
        session: sessionRef.current,
        setSession,
        setMessages,
        pushAssistant,
        executeStep,
        flashFields,
        confirmParticipantChoice,
        runParticipantLookup,
        openQueuedHead,
        newMessage,
      });
    },
    [
      confirmParticipantChoice,
      ctx,
      executeStep,
      flashFields,
      location.pathname,
      location.search,
      messages,
      nextSteps,
      openQueuedHead,
      pushAssistant,
      runParticipantLookup,
      scoringBlockers,
      siblingSteps,
      statuses,
    ]
  );

  const skipSideActions = useCallback(() => {
    setSession((s) => markSideActionsSkipped(s));
  }, []);

  const markReportsSeen = useCallback(() => {
    setSession((s) => markReportsOpened(s));
  }, []);

  const value: DirectorGuideValue = {
    ctx,
    statuses,
    nextSteps,
    session,
    pendingModal,
    clearPendingModal,
    requestOpenModal,
    executeStep,
    notifyStepCompleted,
    skipSideActions,
    markReportsSeen,
    setFocusTournament,
    setFocusEvent,
    messages,
    pushAssistant,
    handleUserUtterance,
    confirmParticipantChoice,
    scoringBlockers,
    siblingSteps,
    panelOpen,
    setPanelOpen,
    paletteOpen,
    setPaletteOpen,
  };

  return (
    <DirectorGuideContext.Provider value={value}>
      {children}
      <SpotlightOverlay spotlight={spotlight} onDismiss={clearSpotlight} />
    </DirectorGuideContext.Provider>
  );
};

export function useDirectorGuide(): DirectorGuideValue {
  const ctx = useContext(DirectorGuideContext);
  if (!ctx) {
    throw new Error('useDirectorGuide must be used within DirectorGuideProvider');
  }
  return ctx;
}

/** Safe for pages that also render outside director layouts (e.g. public event). */
export function useOptionalDirectorGuide(): DirectorGuideValue | null {
  return useContext(DirectorGuideContext);
}
