import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import EventDetails from '@/pages/events/EventDetails';
import { Role, type UserRead } from '@/types/user';

const useAuthMock = vi.fn();
const getCompleteEventMock = vi.fn();
const getEventDirectorAccessMock = vi.fn();
const getEventParticipantsMock = vi.fn();
const listFormatTemplatesMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/api/events', () => ({
  EventsAPI: {
    getCompleteEvent: (...args: unknown[]) => getCompleteEventMock(...args),
    getEventParticipants: (...args: unknown[]) => getEventParticipantsMock(...args),
    updateEvent: vi.fn(),
  },
}));

vi.mock('@/api/directors', () => ({
  DirectorsAPI: {
    getEventDirectorAccess: (...args: unknown[]) => getEventDirectorAccessMock(...args),
  },
}));

vi.mock('@/api/eventFormatTemplates', () => ({
  eventFormatTemplatesApi: {
    list: (...args: unknown[]) => listFormatTemplatesMock(...args),
  },
}));

vi.mock('@/components/event/basicinfo', () => ({
  AboutEventCard: () => <div data-testid="about-event-card" />,
  EventRulesCard: () => null,
  EventDetailsCard: () => null,
  EventReservedLanesCard: () => null,
  HandicapInformationCard: () => null,
  EventFormatCard: () => null,
  PrizePayoutInformationCard: () => null,
  ChampionshipResultsCard: () => null,
  FinalPayoutsContent: () => null,
}));

vi.mock('@/components/event/basicinfo/RoundLiveScoresModal', () => ({
  default: () => null,
}));

vi.mock('@/components/event/flow/EventFlowPreview', () => ({
  default: () => null,
}));

vi.mock('@/components/event/flow/RoundFlowManagement', () => ({
  invalidateEventFlowStructureQueries: vi.fn(),
}));

vi.mock('@/components/event-round', () => ({
  SquadsTab: () => <div data-testid="squads-tab" />,
  GameScoringTab: () => <div data-testid="game-scoring-tab" />,
}));

vi.mock('@/components/side_actions/EventSideActionsPanel', () => ({
  default: () => <div data-testid="side-actions-tab" />,
}));

vi.mock('@/components/event/ParticipantManagementTable', () => ({
  default: () => null,
}));

vi.mock('@/components/event/AddParticipantsModal', () => ({ default: () => null }));
vi.mock('@/components/event/BatchAddParticipantsModal', () => ({ default: () => null }));
vi.mock('@/components/event/BatchAddTeamMembersModal', () => ({ default: () => null }));
vi.mock('@/components/event/QuickTeamRegistrationModal', () => ({ default: () => null }));
vi.mock('@/components/event/TeamRegistrationModal', () => ({ default: () => null }));
vi.mock('@/components/event/EventShareModal', () => ({ default: () => null }));
vi.mock('@/components/director/DirectorPermissionsModal', () => ({ default: () => null }));
vi.mock('@/components/event/EventSignupCta', () => ({ default: () => null }));
vi.mock('@/components/event/EventTdRegistrationSettingsCard', () => ({ default: () => null }));
vi.mock('@/components/event/SaveEventFormatLibraryModal', () => ({
  default: () => null,
  SAVE_FORMAT_TO_LIBRARY_BUTTON_LABEL: 'Save format',
}));

const tdUser: UserRead = {
  id: 1,
  first_name: 'Test',
  last_name: 'Director',
  email: 'td@example.com',
  role: Role.TD,
  created_at: '2026-01-01T00:00:00',
  is_active: true,
  is_verified: true,
  can_claim: false,
};

const eventComplete = {
  id: 42,
  name: 'Mount Test Classic',
  tournament_id: 5,
  team_size: 4,
  rounds: [],
  final_nodes: [],
  tournament: {
    id: 5,
    name: 'Parent Open',
    organizer_id: 1,
  },
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/director/events/42']}>
        <Routes>
          <Route path="/director/events/:id" element={<EventDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('EventDetails mount', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders event title and info tab content for authenticated TD', async () => {
    useAuthMock.mockReturnValue({ user: tdUser, loading: false });
    getCompleteEventMock.mockResolvedValue(eventComplete);
    getEventDirectorAccessMock.mockResolvedValue({
      can_manage_event_info: true,
      can_manage_event_format: true,
      can_manage_participants: true,
      can_manage_squads: true,
      can_manage_lane_assignments: true,
      can_manage_game_scoring: true,
      can_manage_delegation: true,
      is_tournament_organizer_or_co_owner: true,
    });
    listFormatTemplatesMock.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Mount Test Classic' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('about-event-card')).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Event Info' })).toBeInTheDocument();
  });

  it('loads participants when the participants tab is selected', async () => {
    useAuthMock.mockReturnValue({ user: tdUser, loading: false });
    getCompleteEventMock.mockResolvedValue(eventComplete);
    getEventDirectorAccessMock.mockResolvedValue({
      can_manage_participants: true,
      can_manage_squads: false,
      can_manage_lane_assignments: false,
      can_manage_game_scoring: false,
      is_tournament_organizer_or_co_owner: true,
    });
    getEventParticipantsMock.mockResolvedValue([]);
    listFormatTemplatesMock.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Participant Management' }));
    await waitFor(() => {
      expect(getEventParticipantsMock).toHaveBeenCalledWith(42);
    });
  });

  it('keeps participants tab selected when opened during director access load', async () => {
    let resolveAccess!: (value: Record<string, unknown>) => void;
    const accessPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveAccess = resolve;
    });

    useAuthMock.mockReturnValue({ user: tdUser, loading: false });
    getCompleteEventMock.mockResolvedValue(eventComplete);
    getEventDirectorAccessMock.mockReturnValue(accessPromise);
    getEventParticipantsMock.mockResolvedValue([]);
    listFormatTemplatesMock.mockResolvedValue([]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/director/events/42?tab=participants']}>
          <Routes>
            <Route path="/director/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const tab = await screen.findByRole('tab', { name: 'Participant Management' });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/registration status/i)).toBeInTheDocument();

    resolveAccess({
      can_manage_participants: true,
      can_manage_squads: true,
      can_manage_lane_assignments: true,
      can_manage_game_scoring: true,
      is_tournament_organizer_or_co_owner: true,
    });

    await waitFor(() => {
      expect(getEventParticipantsMock).toHaveBeenCalledWith(42);
    });
    expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders squads tab panel when squads tab is selected', async () => {
    useAuthMock.mockReturnValue({ user: tdUser, loading: false });
    getCompleteEventMock.mockResolvedValue(eventComplete);
    getEventDirectorAccessMock.mockResolvedValue({
      can_manage_participants: false,
      can_manage_squads: true,
      can_manage_lane_assignments: false,
      can_manage_game_scoring: false,
      is_tournament_organizer_or_co_owner: true,
    });
    listFormatTemplatesMock.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Squads' }));
    expect(await screen.findByTestId('squads-tab')).toBeInTheDocument();
  });

  it('renders lane assignments tab when lane capability is granted', async () => {
    useAuthMock.mockReturnValue({ user: tdUser, loading: false });
    getCompleteEventMock.mockResolvedValue(eventComplete);
    getEventDirectorAccessMock.mockResolvedValue({
      can_manage_participants: false,
      can_manage_squads: false,
      can_manage_lanes: true,
      can_manage_game_scoring: false,
      is_tournament_organizer_or_co_owner: true,
    });
    listFormatTemplatesMock.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Mount Test Classic' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lane Assignments' })).toBeInTheDocument();
    expect(screen.queryByText('Coming Soon')).not.toBeInTheDocument();
  });

  it('renders game scoring tab panel when selected', async () => {
    useAuthMock.mockReturnValue({ user: tdUser, loading: false });
    getCompleteEventMock.mockResolvedValue(eventComplete);
    getEventDirectorAccessMock.mockResolvedValue({
      can_manage_participants: false,
      can_manage_squads: false,
      can_manage_lanes: false,
      can_manage_game_scoring: true,
      is_tournament_organizer_or_co_owner: true,
    });
    listFormatTemplatesMock.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Game Scoring' }));
    expect(await screen.findByTestId('game-scoring-tab')).toBeInTheDocument();
  });

  it('renders side actions tab panel when side actions tab is selected', async () => {
    useAuthMock.mockReturnValue({ user: tdUser, loading: false });
    getCompleteEventMock.mockResolvedValue(eventComplete);
    getEventDirectorAccessMock.mockResolvedValue({
      can_manage_participants: false,
      can_manage_squads: false,
      can_manage_lanes: false,
      can_manage_game_scoring: false,
      is_tournament_organizer_or_co_owner: true,
    });
    listFormatTemplatesMock.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Side Action' }));
    expect(await screen.findByTestId('side-actions-tab')).toBeInTheDocument();
  });

  it('shows load error when event fetch fails', async () => {
    useAuthMock.mockReturnValue({ user: tdUser, loading: false });
    getCompleteEventMock.mockRejectedValue(new Error('network'));
    getEventDirectorAccessMock.mockResolvedValue({});
    listFormatTemplatesMock.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Error loading event details.')).toBeInTheDocument();
  });
});
