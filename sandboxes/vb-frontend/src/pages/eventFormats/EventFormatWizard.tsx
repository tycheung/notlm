import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Breadcrumb from '../../components/common/Breadcrumb';
import PageTitle from '../../components/common/PageTitle';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Label from '../../components/common/Label';
import SaveEventFormatLibraryModal, {
  SAVE_FORMAT_TO_LIBRARY_BUTTON_LABEL,
} from '../../components/event/SaveEventFormatLibraryModal';
import Loading from '../../components/common/Loading';
import TournamentFlowDiagram from '../../components/event/flow/TournamentFlowDiagram';
import TemplateRoundEditorModal from '../../components/eventFormatWizard/TemplateRoundEditorModal';
import TemplateRelationshipEditorModal, {
  TemplateRelCreateMode,
} from '../../components/eventFormatWizard/TemplateRelationshipEditorModal';
import TemplateFinalNodeEditorModal from '../../components/eventFormatWizard/TemplateFinalNodeEditorModal';
import { useAuth } from '../../contexts/AuthContext';
import { eventFormatTemplatesApi } from '../../api/eventFormatTemplates';
import type { UserEventFormatTemplateRead } from '../../types/eventFormatTemplate';
import {
  cloneDefaultEventStructurePayload,
  type EventStructurePayload,
} from '../../constants/defaultEventStructurePayload';
import { DEFAULT_ROUND_FORMAT_NAME } from '../../constants/roundFormatDefaults';
import {
  clearWizardDraft,
  flushWizardDraftBeforeUnload,
  loadWizardDraft,
  saveWizardDraft,
  type WizardDraftContext,
  WIZARD_DRAFT_SCHEMA,
} from '../../utils/eventFormatWizardDraftStorage';
import {
  isSupportedPayloadVersion,
  payloadToFlowViewModel,
  refToSyntheticId,
  syncStructurePayloadCounts,
  syncRoundScoringFields,
  syncRoundSquadsFields,
  ensurePayloadRoundsHaveSquads,
} from '../../utils/eventStructurePayloadFlow';
import { sortEventFormatTemplates } from '../../utils/eventFormatTemplateSorting';
import { GUIDE_IDS } from '../../features/director-guide/guideIds';
import { useOptionalDirectorGuide } from '../../features/director-guide';
import { saveAndApplyFormatDraft } from '../../features/director-guide/formatGuideOps';
import { summarizeFormatDraft } from '../../features/director-guide/formatDraftCompiler';
import { getErrorMessage } from '../../api/apiErrors';

function findRoundSpec(
  payload: EventStructurePayload,
  syntheticId: number
): Record<string, unknown> | null {
  for (const r of payload.rounds as Record<string, unknown>[]) {
    if (refToSyntheticId(String(r.ref ?? '')) === syntheticId) {
      return r;
    }
  }
  return null;
}

function findFinalSpec(
  payload: EventStructurePayload,
  syntheticId: number
): Record<string, unknown> | null {
  for (const fn of (payload.final_nodes || []) as Record<string, unknown>[]) {
    if (refToSyntheticId(String(fn.ref ?? '')) === syntheticId) {
      return fn;
    }
  }
  return null;
}

function findRelIndexById(payload: EventStructurePayload, relId: number): number {
  const { relationships } = payloadToFlowViewModel(payload);
  return relationships.findIndex((r) => r.id === relId);
}

const EventFormatWizard: React.FC = () => {
  const { templateId: templateIdParam } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = location.pathname.startsWith('/admin') ? '/admin' : '/director';
  const { user } = useAuth();
  const userId = user?.id;
  const guide = useOptionalDirectorGuide();
  const queryClient = useQueryClient();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const guideEventId = Number(searchParams.get('eventId') || '') || null;
  const fromGuide = searchParams.get('fromGuide') === '1';
  const [applyingToEvent, setApplyingToEvent] = useState(false);

  const urlTemplateId = templateIdParam ? parseInt(templateIdParam, 10) : null;

  const [payload, setPayload] = useState<EventStructurePayload>(() =>
    cloneDefaultEventStructurePayload()
  );
  const [wizardContext, setWizardContext] = useState<WizardDraftContext>({ mode: 'new' });
  const [hydrated, setHydrated] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const [roundModal, setRoundModal] = useState<{
    open: boolean;
    draft: Record<string, unknown> | null;
    isNew: boolean;
  }>({ open: false, draft: null, isNew: false });

  const [relModal, setRelModal] = useState<{
    open: boolean;
    draft: Record<string, unknown> | null;
    isNew: boolean;
    mode: TemplateRelCreateMode;
  }>({ open: false, draft: null, isNew: false, mode: 'round_target' });

  const [finalModal, setFinalModal] = useState<{
    open: boolean;
    draft: Record<string, unknown> | null;
    isNew: boolean;
  }>({ open: false, draft: null, isNew: false });

  const [saveOpen, setSaveOpen] = useState(false);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageType, setStageType] = useState<'round' | 'payout'>('round');
  const [stageName, setStageName] = useState('');

  const { data: templatesRaw, isLoading: templatesLoading } = useQuery({
    queryKey: ['eventFormatTemplates'],
    queryFn: () => eventFormatTemplatesApi.list(),
    enabled: !!userId,
  });
  const templates = useMemo(
    () => sortEventFormatTemplates(Array.isArray(templatesRaw) ? templatesRaw : []),
    [templatesRaw]
  );

  const loadedTemplate = useMemo((): UserEventFormatTemplateRead | null => {
    if (!urlTemplateId || Number.isNaN(urlTemplateId)) return null;
    return templates.find((t) => t.id === urlTemplateId) ?? null;
  }, [templates, urlTemplateId]);

  // Initial hydrate: draft vs URL
  useEffect(() => {
    if (!userId || hydrated) return;

    const draft = loadWizardDraft(userId);
    const hasDraft =
      draft &&
      isSupportedPayloadVersion(draft.payload.version) &&
      draft.draftSchema === WIZARD_DRAFT_SCHEMA;

    if (hasDraft && draft) {
      const urlTid = urlTemplateId;
      const draftTid = draft.context.mode === 'edit' ? draft.context.templateId : undefined;
      const conflict =
        (urlTid != null &&
          !Number.isNaN(urlTid) &&
          draft.context.mode === 'edit' &&
          draftTid !== urlTid) ||
        (urlTid != null && !Number.isNaN(urlTid) && draft.context.mode === 'new');

      if (conflict) {
        setConflictOpen(true);
        setHydrated(true);
        return;
      }

      setPayload(draft.payload);
      setWizardContext(draft.context);
      setHydrated(true);
      return;
    }

    if (urlTemplateId != null && !Number.isNaN(urlTemplateId)) {
      setHydrated(true);
      return;
    }

    setWizardContext({ mode: 'new' });
    setPayload(cloneDefaultEventStructurePayload());
    setHydrated(true);
  }, [userId, hydrated, urlTemplateId]);

  // Load template from list when URL has id and not from draft
  useEffect(() => {
    if (!hydrated || conflictOpen) return;
    if (urlTemplateId == null || Number.isNaN(urlTemplateId)) return;
    const draft = userId ? loadWizardDraft(userId) : null;
    if (
      draft &&
      draft.context.mode === 'edit' &&
      draft.context.templateId === urlTemplateId &&
      isSupportedPayloadVersion(draft.payload.version)
    ) {
      return;
    }
    if (!loadedTemplate) return;
    const p = loadedTemplate.payload as EventStructurePayload;
    if (!p || typeof p !== 'object') return;
    setPayload(JSON.parse(JSON.stringify(p)) as EventStructurePayload);
    setWizardContext({
      mode: 'edit',
      templateId: loadedTemplate.id,
      templateName: loadedTemplate.name,
    });
  }, [hydrated, conflictOpen, urlTemplateId, loadedTemplate, userId]);

  const persistDraft = useCallback(() => {
    if (!userId) return;
    saveWizardDraft({
      draftSchema: WIZARD_DRAFT_SCHEMA,
      userId,
      updatedAt: new Date().toISOString(),
      context: wizardContext,
      payload,
    });
  }, [userId, wizardContext, payload]);

  useEffect(() => {
    if (!userId || !hydrated) return;
    const t = window.setTimeout(persistDraft, 450);
    return () => window.clearTimeout(t);
  }, [userId, hydrated, persistDraft, payload, wizardContext]);

  useEffect(() => {
    if (!userId) return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        flushWizardDraftBeforeUnload(userId, {
          draftSchema: WIZARD_DRAFT_SCHEMA,
          userId,
          updatedAt: new Date().toISOString(),
          context: wizardContext,
          payload,
        });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [userId, wizardContext, payload]);

  const draftRef = useRef({ wizardContext, payload });
  draftRef.current = { wizardContext, payload };
  useEffect(() => {
    if (!userId) return;
    const onBeforeUnload = () => {
      const d = draftRef.current;
      flushWizardDraftBeforeUnload(userId, {
        draftSchema: WIZARD_DRAFT_SCHEMA,
        userId,
        updatedAt: new Date().toISOString(),
        context: d.wizardContext,
        payload: d.payload,
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [userId]);

  const flow = useMemo(() => payloadToFlowViewModel(payload), [payload]);
  const roundRefs = useMemo(
    () => (payload.rounds as Record<string, unknown>[]).map((r) => String(r.ref ?? '')),
    [payload.rounds]
  );
  const roundRefLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    (payload.rounds as Record<string, unknown>[]).forEach((r) => {
      const ref = String(r.ref ?? '');
      if (!ref) return;
      const friendly = String(r.friendly_name ?? '').trim();
      labels[ref] = friendly || ref;
    });
    return labels;
  }, [payload.rounds]);
  const finalRefs = useMemo(
    () => ((payload.final_nodes || []) as Record<string, unknown>[]).map((f) => String(f.ref ?? '')),
    [payload.final_nodes]
  );
  const finalRefLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    ((payload.final_nodes || []) as Record<string, unknown>[]).forEach((f) => {
      const ref = String(f.ref ?? '');
      if (!ref) return;
      const name = String(f.name ?? '').trim();
      labels[ref] = name || ref;
    });
    return labels;
  }, [payload.final_nodes]);

  const handleResumeDraft = () => {
    if (!userId) return;
    const draft = loadWizardDraft(userId);
    if (draft) {
      setPayload(draft.payload);
      setWizardContext(draft.context);
    }
    setConflictOpen(false);
  };

  const handleLoadFromUrl = () => {
    if (!userId) return;
    clearWizardDraft(userId);
    setConflictOpen(false);
    setHydrated(false);
    setPayload(cloneDefaultEventStructurePayload());
    setWizardContext(
      urlTemplateId != null && !Number.isNaN(urlTemplateId)
        ? { mode: 'edit', templateId: urlTemplateId }
        : { mode: 'new' }
    );
    window.setTimeout(() => setHydrated(true), 0);
  };

  const discardDraft = () => {
    if (userId) clearWizardDraft(userId);
    setPayload(cloneDefaultEventStructurePayload());
    setWizardContext({ mode: 'new' });
    navigate(`${prefix}/event-formats/wizard`);
    setPageSuccess('Draft discarded. Starting from the default structure.');
  };

  const addRound = (friendlyName?: string) => {
    const rounds = payload.rounds as Record<string, unknown>[];
    const nums = rounds.map((r) => Number(r.round_number ?? 0));
    const nextNum = (nums.length ? Math.max(...nums) : 0) + 1;
    let n = 1;
    let ref = `round_${n}`;
    const existing = new Set(rounds.map((r) => String(r.ref)));
    while (existing.has(ref)) {
      n += 1;
      ref = `round_${n}`;
    }
    const spec: Record<string, unknown> = {
      ref,
      round_number: nextNum,
      friendly_name: friendlyName?.trim() || `Round ${nextNum}`,
      round_format_name: DEFAULT_ROUND_FORMAT_NAME,
      game_count: 1,
      status: 'scheduled',
      advancement_type: 'total_pinfall',
      tiebreaker_rule: 'highest_game',
      competition_method: 'eliminator',
      competition_method_config: {
        game_count: 1,
      },
      allows_reentry: false,
    };
    syncRoundScoringFields(spec);
    syncRoundSquadsFields(spec);
    setPayload({
      ...payload,
      rounds: [...rounds, spec],
    });
  };

  const addFinalNode = (name: string) => {
    const finalNodes = (payload.final_nodes || []) as Record<string, unknown>[];
    const spec: Record<string, unknown> = {
      ref: `exit_${Date.now()}`,
      name,
      description: null,
      display_order: finalNodes.length,
      is_active: true,
      placement_count: 0,
    };
    setPayload({
      ...payload,
      final_nodes: [...finalNodes, spec],
    });
  };

  const openAddStage = () => {
    setStageType('round');
    setStageName('');
    setStageModalOpen(true);
  };

  const handleCreateStage = () => {
    const name = stageName.trim();
    if (!name) {
      return;
    }
    if (stageType === 'round') {
      addRound(name);
    } else {
      addFinalNode(name);
    }
    setStageModalOpen(false);
  };

  const deleteRoundByRef = (ref: string) => {
    const rounds = (payload.rounds as Record<string, unknown>[]).filter(
      (r) => String(r.ref) !== ref
    );
    const rels = (payload.relationships as Record<string, unknown>[]).filter((rel) => {
      if (String(rel.source_ref) === ref) return false;
      if (rel.target_ref != null && String(rel.target_ref) === ref) return false;
      return true;
    });
    setPayload(syncStructurePayloadCounts({ ...payload, rounds, relationships: rels }));
  };

  const preferredOverwriteTemplateId =
    loadedTemplate && !loadedTemplate.is_system ? loadedTemplate.id : null;

  const handleRoundDbl = (roundId: number) => {
    const spec = findRoundSpec(payload, roundId);
    if (spec) setRoundModal({ open: true, draft: spec, isNew: false });
  };

  const handleFinalDbl = (finalId: number) => {
    const spec = findFinalSpec(payload, finalId);
    if (!spec) return;
    setFinalModal({ open: true, draft: spec, isNew: false });
  };

  const handleRelClick = (relationshipId: number) => {
    const idx = findRelIndexById(payload, relationshipId);
    if (idx < 0) return;
    const rel = (payload.relationships as Record<string, unknown>[])[idx];
    setRelModal({
      open: true,
      draft: rel,
      isNew: false,
      mode: rel.target_final_ref ? 'final_node_target' : 'round_target',
    });
  };

  const handleChampionshipEdge = (relationshipId: number) => {
    handleRelClick(relationshipId);
  };

  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <Alert variant="info" message="Sign in to use the Event Format wizard." />
      </div>
    );
  }

  if (urlTemplateId != null && !Number.isNaN(urlTemplateId) && templatesLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loading />
      </div>
    );
  }

  if (urlTemplateId != null && !Number.isNaN(urlTemplateId) && !templatesLoading && !loadedTemplate) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <Alert variant="error" message="Saved format not found." />
        <Button className="mt-4" variant="lightbackground" onClick={() => navigate(`${prefix}/event-formats`)}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <Breadcrumb
        items={[
          { label: 'Home', path: '/' },
          { label: 'Dashboard', path: `${prefix}` },
          { label: 'Event formats', path: `${prefix}/event-formats` },
          { label: 'Wizard' },
        ]}
      />
      <PageTitle className="mt-4 mb-2">
        Event format wizard
      </PageTitle>
      <p className="text-text-muted mb-4">
        Build a reusable structure (rounds, squads, relationships, exit nodes). Nothing is scheduled on
        a calendar here—applying a format to an event creates squads with default start times.
      </p>
      <p className="text-xs text-text-muted mb-4">
        Arrows are directed: source stage to destination stage. Edit rounds to set competition format and
        carry-over; edit arrows to set ranking overrides, advancement counts, and routing.
      </p>

      {pageError && (
        <Alert variant="error" message={pageError} onDismiss={() => setPageError(null)} className="mb-4" />
      )}
      {pageSuccess && (
        <Alert
          variant="success"
          message={pageSuccess}
          onDismiss={() => setPageSuccess(null)}
          className="mb-4"
        />
      )}

      {/* Match Event Details → Event Flow tab: format / library actions above the graph */}
      <div className="flex flex-wrap gap-2 items-center mb-4" data-guide-id={GUIDE_IDS.FORMAT_WIZARD}>
        <Button
          type="button"
          variant="lightbackground"
          data-guide-id={GUIDE_IDS.FORMAT_SAVE}
          onClick={() => setSaveOpen(true)}
        >
          {SAVE_FORMAT_TO_LIBRARY_BUTTON_LABEL}
        </Button>
        {fromGuide && guideEventId != null && userId != null && (
          <Button
            type="button"
            variant="darkbackground"
            data-guide-id={GUIDE_IDS.FORMAT_APPLY_TO_EVENT}
            isLoading={applyingToEvent}
            onClick={async () => {
              setApplyingToEvent(true);
              setPageError(null);
              try {
                await saveAndApplyFormatDraft({
                  userId,
                  eventId: guideEventId,
                  payload: syncStructurePayloadCounts(ensurePayloadRoundsHaveSquads(payload)),
                  description: summarizeFormatDraft(payload),
                  replaceExisting: true,
                });
                void queryClient.invalidateQueries({ queryKey: ['eventComplete', guideEventId] });
                void queryClient.invalidateQueries({ queryKey: ['eventRounds', guideEventId] });
                guide?.notifyStepCompleted('apply_format', { eventId: guideEventId });
                setPageSuccess('Saved format and applied it to the event.');
                navigate(`${prefix}/events/${guideEventId}`);
              } catch (err) {
                setPageError(getErrorMessage(err, 'Could not apply format to the event.'));
              } finally {
                setApplyingToEvent(false);
              }
            }}
          >
            Apply to event
          </Button>
        )}
        <Button
          type="button"
          variant="lightbackground"
          title="Manage saved formats"
          aria-label="Manage saved formats"
          onClick={() => navigate(`${prefix}/event-formats`)}
        >
          Manage Formats
        </Button>
        <Button type="button" variant="lightbackground" onClick={discardDraft}>
          Discard draft
        </Button>
      </div>

      {/* Match current advancement-format structure controls */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Button
          type="button"
          variant="darkbackground"
          data-guide-id={GUIDE_IDS.FORMAT_ADD_STAGE}
          onClick={openAddStage}
        >
          Add Stage
        </Button>
        <Button
          type="button"
          variant="darkbackground"
          data-guide-id={GUIDE_IDS.FORMAT_ADD_RELATIONSHIP}
          onClick={() =>
            setRelModal({ open: true, draft: null, isNew: true, mode: 'round_target' })
          }
        >
          Add Relationship
        </Button>
      </div>

      {loadedTemplate?.is_system && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-4">
          Built-in template: use <strong>{SAVE_FORMAT_TO_LIBRARY_BUTTON_LABEL}</strong> and choose{' '}
          <strong>Save as new format</strong> to fork a custom copy. Built-in entries cannot be updated
          in place.
        </p>
      )}

      <div className="bg-surface rounded-lg shadow-sm border border-border">
        <TournamentFlowDiagram
          rounds={flow.rounds}
          relationships={flow.relationships}
          finalNodes={flow.finalNodes}
          onRoundClick={handleRoundDbl}
          onFinalNodeDoubleClick={handleFinalDbl}
          onChampionshipEdgeClick={handleChampionshipEdge}
          onRelationshipClick={handleRelClick}
          hideParticipantCount
        />
      </div>

      <Modal
        isOpen={conflictOpen}
        onClose={() => setConflictOpen(false)}
        title="Resume unsaved wizard?"
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="lightbackground" onClick={() => setConflictOpen(false)}>
              Cancel
            </Button>
            <Button variant="lightbackground" onClick={handleLoadFromUrl}>
              Load from link (discard unsaved)
            </Button>
            <Button variant="darkbackground" onClick={handleResumeDraft}>
              Resume my draft
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-muted">
          You have an unsaved wizard draft that does not match this page. Choose whether to continue
          editing your draft or load the format from the link (your draft will be cleared from this
          browser).
        </p>
      </Modal>

      <SaveEventFormatLibraryModal
        source="wizard"
        isOpen={saveOpen}
        onClose={() => setSaveOpen(false)}
        userId={userId}
        templates={templates}
        wizardPayload={payload}
        preferredOverwriteTemplateId={preferredOverwriteTemplateId}
        onWizardAfterSave={() => {
          if (userId) clearWizardDraft(userId);
        }}
        onSaved={(message) => setPageSuccess(message)}
      />

      <TemplateRoundEditorModal
        isOpen={roundModal.open}
        onClose={() => setRoundModal({ open: false, draft: null, isNew: false })}
        draft={roundModal.draft}
        relationships={payload.relationships as Record<string, unknown>[]}
        isNew={roundModal.isNew}
        onSave={(next) => {
          syncRoundScoringFields(next);
          syncRoundSquadsFields(next);
          if (roundModal.isNew) {
            setPayload({
              ...payload,
              rounds: [...(payload.rounds as Record<string, unknown>[]), next],
            });
          } else {
            const ref = String(next.ref);
            setPayload({
              ...payload,
              rounds: (payload.rounds as Record<string, unknown>[]).map((r) =>
                String(r.ref) === ref ? next : r
              ),
            });
          }
        }}
        onDelete={
          roundModal.isNew
            ? undefined
            : () => {
                const ref = String(roundModal.draft?.ref ?? '');
                if (ref) deleteRoundByRef(ref);
                setRoundModal({ open: false, draft: null, isNew: false });
              }
        }
      />

      <Modal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        title="Add Stage"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="lightbackground" onClick={() => setStageModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="darkbackground" onClick={handleCreateStage}>
              Create Stage
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Stage type</Label>
            <select
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              value={stageType}
              onChange={(e) => setStageType(e.target.value as 'round' | 'payout')}
            >
              <option value="round">Round</option>
              <option value="payout">Payout</option>
            </select>
          </div>
          <Input
            label="Name"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            fullWidth
          />
        </div>
      </Modal>

      <TemplateRelationshipEditorModal
        isOpen={relModal.open}
        onClose={() => setRelModal({ open: false, draft: null, isNew: false, mode: 'round_target' })}
        draft={relModal.draft}
        roundRefs={roundRefs}
        roundLabels={roundRefLabels}
        roundSpecs={payload.rounds as Record<string, unknown>[]}
        finalRefs={finalRefs}
        finalLabels={finalRefLabels}
        existingRelationships={payload.relationships as Record<string, unknown>[]}
        isNew={relModal.isNew}
        createMode={relModal.mode}
        onSave={(next) => {
          let relationships: Record<string, unknown>[];
          if (relModal.isNew) {
            relationships = [
              ...(payload.relationships as Record<string, unknown>[]),
              next,
            ];
          } else {
            const idx = relModal.draft
              ? (payload.relationships as Record<string, unknown>[]).indexOf(relModal.draft)
              : -1;
            if (idx < 0) return;
            relationships = [...(payload.relationships as Record<string, unknown>[])];
            relationships[idx] = next;
          }
          setPayload(syncStructurePayloadCounts({ ...payload, relationships }));
        }}
        onDelete={
          relModal.isNew
            ? undefined
            : () => {
                const idx = relModal.draft
                  ? (payload.relationships as Record<string, unknown>[]).indexOf(relModal.draft)
                  : -1;
                if (idx >= 0) {
                  const copy = [...(payload.relationships as Record<string, unknown>[])];
                  copy.splice(idx, 1);
                  setPayload(
                    syncStructurePayloadCounts({ ...payload, relationships: copy })
                  );
                }
                setRelModal({ open: false, draft: null, isNew: false, mode: 'round_target' });
              }
        }
      />

      <TemplateFinalNodeEditorModal
        isOpen={finalModal.open}
        onClose={() => {
          setFinalModal({ open: false, draft: null, isNew: false });
        }}
        draft={finalModal.draft}
        isNew={finalModal.isNew}
        onSave={(next) => {
          const list = (payload.final_nodes || []) as Record<string, unknown>[];
          if (finalModal.isNew) {
            setPayload({ ...payload, final_nodes: [...list, next] });
          } else {
            const ref = String(next.ref);
            setPayload({
              ...payload,
              final_nodes: list.map((f) => (String(f.ref) === ref ? next : f)),
            });
          }
        }}
        onDelete={
          finalModal.isNew
            ? undefined
            : () => {
                const ref = String(finalModal.draft?.ref ?? '');
                if (!ref) return;
                const list = ((payload.final_nodes || []) as Record<string, unknown>[]).filter(
                  (f) => String(f.ref) !== ref
                );
                const rels = (payload.relationships as Record<string, unknown>[]).filter(
                  (r) => String(r.target_final_ref || '') !== ref
                );
                setPayload({ ...payload, final_nodes: list, relationships: rels });
                setFinalModal({ open: false, draft: null, isNew: false });
              }
        }
      />
    </div>
  );
};

export default EventFormatWizard;
