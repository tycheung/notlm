import { useCallback, useEffect } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';

import {
  resolveEventDetailsTab,
  shouldRedirectUnauthorizedEventDetailsTab,
  TabType,
  type EventDetailsShellMode,
} from './eventDetailsTabs';

type TabAccessInput = {
  tabParam: string | null;
  setSearchParams: SetURLSearchParams;
  shellMode?: EventDetailsShellMode;
};

/** URL is the single source of truth for the active EventDetails tab. */
export function useEventDetailsTabState(input: TabAccessInput) {
  const { tabParam, setSearchParams, shellMode = 'default' } = input;

  const activeTab = resolveEventDetailsTab(tabParam, { shellMode });

  const handleTabChange = useCallback(
    (tab: TabType | string) => {
      const tabType = tab as TabType;
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (shellMode === 'saDesk' && tabType === TabType.PARTICIPANTS) {
            nextParams.set('tab', TabType.PARTICIPANTS);
          } else if (tabType === TabType.INFO) {
            nextParams.delete('tab');
          } else {
            nextParams.set('tab', tabType);
          }
          return nextParams;
        },
        { replace: false }
      );
    },
    [setSearchParams, shellMode]
  );

  return { activeTab, handleTabChange };
}

type UnauthorizedTabRedirectInput = {
  directorAccessReady: boolean;
  eventCompleteLoaded: boolean;
  activeTab: TabType;
  canParticipants: boolean;
  canSquads: boolean;
  showLanesTab: boolean;
  canGameScoring: boolean;
  showFormatEditorTab: boolean;
  showStandingsTab: boolean;
  shellMode: EventDetailsShellMode;
  setSearchParams: SetURLSearchParams;
};

export function useUnauthorizedEventTabRedirect(input: UnauthorizedTabRedirectInput) {
  const {
    directorAccessReady,
    eventCompleteLoaded,
    activeTab,
    canParticipants,
    canSquads,
    showLanesTab,
    canGameScoring,
    showFormatEditorTab,
    showStandingsTab,
    shellMode,
    setSearchParams,
  } = input;

  useEffect(() => {
    if (!directorAccessReady || !eventCompleteLoaded) return;

    if (
      !shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: true,
        activeTab,
        canParticipants,
        canSquads,
        canLanes: showLanesTab,
        canGameScoring,
        canFormatEditor: showFormatEditorTab,
        canStandings: showStandingsTab,
        shellMode,
      })
    ) {
      return;
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (shellMode === 'saDesk') {
          next.set('tab', TabType.PARTICIPANTS);
        } else {
          next.delete('tab');
        }
        return next;
      },
      { replace: true }
    );
  }, [
    directorAccessReady,
    eventCompleteLoaded,
    activeTab,
    canParticipants,
    canSquads,
    showLanesTab,
    canGameScoring,
    showFormatEditorTab,
    showStandingsTab,
    shellMode,
    setSearchParams,
  ]);
}
