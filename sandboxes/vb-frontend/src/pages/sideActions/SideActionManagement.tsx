import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TournamentsAPI } from '../../api/tournaments';
import { BowlingCentersAPI } from '../../api/bowling-centers';
import { DirectorsAPI } from '../../api/directors';
import { TournamentRead } from '../../types/tournament';
import { BowlingCenterRead } from '../../types/bowling_center';
import Button from '../../components/common/Button';
import Table, { Column } from '../../components/common/Table';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import Select from '../../components/common/Select';
import TableSearchInput from '../../components/common/TableSearchInput';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import SaOnlyBadge from '../../components/tournament/SaOnlyBadge';
import SortableHeaderCell from '../../components/common/SortableHeaderCell';
import { toggleSortDirection } from '../../components/common/tableSort';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SideActionEventCreate from './SideActionEventCreate';
import { getTournamentStatusInfo } from '../../utils/tournamentStatus';
import { formatDateLocalNaive } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import {
  filterAndSortTournaments,
  uniqueTournamentOrganizerOptions,
  type TournamentManagementRow,
} from '../tournament_director/tournamentManagementUtils';
import { partitionSaOnlyTournaments } from '../../utils/saOnly';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import {
  canCreateSaEvent,
  isDirectorReadOnly,
} from '../../api/tdAccess';
import DirectorReadOnlyBanner from '../../components/billing/DirectorReadOnlyBanner';
import GatedActionButton from '../../components/billing/GatedActionButton';
import { GUIDE_IDS, useGuideModal } from '../../features/director-guide';

const SideActionManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const canCreateSa = canCreateSaEvent(user?.billing);
  const readOnlyDirector = isDirectorReadOnly(user?.billing);
  const passBlockReason =
    'A Side Action subscription or unused Side Action pass is required.';

  const [tournaments, setTournaments] = useState<TournamentManagementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  useGuideModal('tournamentCreate', openCreateModal);
  const [modalJustClosed, setModalJustClosed] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  >('all');
  const [organizerFilter, setOrganizerFilter] = useState('all');
  const [sortField, setSortField] = useState<
    'name' | 'start_date' | 'end_date' | 'location' | 'status' | 'td'
  >('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const isMounted = useRef(false);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const response =
        user?.role === Role.TD || user?.role === Role.SA
          ? await DirectorsAPI.getMyTournaments()
          : await TournamentsAPI.getTournaments({ active_only: false });

      const { saOnly } = partitionSaOnlyTournaments(response);
      const allBowlingCenters = await BowlingCentersAPI.getBowlingCenters();
      const bowlingCenterMap = new Map<number, BowlingCenterRead>(
        allBowlingCenters.map((center: BowlingCenterRead) => [center.id, center])
      );

      const withCenters = saOnly.map((tournament) => {
        const bowlingCenter = bowlingCenterMap.get(tournament.bowling_center_id);
        return {
          ...tournament,
          centerName: bowlingCenter?.name || 'Unknown Center',
          centerCity: bowlingCenter?.city || 'Unknown',
          centerState: bowlingCenter?.state || 'Unknown',
        };
      });

      setTournaments(withCenters);
      setError(null);
    } catch (err) {
      console.error('Error fetching side action events:', err);
      setError('Failed to load side action events. Please log out and back in again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    void fetchTournaments();
    return () => {
      isMounted.current = false;
    };
  }, [user]);

  useEffect(() => {
    if (modalJustClosed && isMounted.current) {
      void fetchTournaments();
      setModalJustClosed(false);
    }
  }, [modalJustClosed]);

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setModalJustClosed(true);
  };

  const openEvent = (tournament: TournamentRead) => {
    const eventId = tournament.sa_only_event_id;
    if (eventId) {
      navigate(roleAwareNav.getSaEventPath(eventId));
    }
  };

  const handleDeleteClick = (id: number) => {
    setTournamentToDelete(id);
  };

  const confirmDeleteTournament = async () => {
    if (tournamentToDelete == null) return;
    const id = tournamentToDelete;
    setTournamentToDelete(null);
    try {
      await TournamentsAPI.deleteTournament(id);
      setTournaments((prev) => prev.filter((tournament) => tournament.id !== id));
    } catch (err) {
      setError('Failed to delete side action event');
      console.error(err);
    }
  };

  const handleSortToggle = (column: typeof sortField) => {
    if (sortField === column) {
      setSortDirection(toggleSortDirection(sortDirection, true));
      return;
    }
    setSortField(column);
    setSortDirection('asc');
  };

  const columns: Column<TournamentManagementRow>[] = [
    { header: 'ID', accessor: (tournament) => tournament.id.toString() },
    {
      header: (
        <SortableHeaderCell
          label="Name"
          columnKey="name"
          activeColumn={sortField}
          direction={sortDirection}
          onToggle={handleSortToggle}
        />
      ),
      accessor: (tournament) => (
        <span className="inline-flex items-center gap-2">
          {tournament.name}
          <SaOnlyBadge />
        </span>
      ),
    },
    {
      header: (
        <SortableHeaderCell
          label="TD"
          columnKey="td"
          activeColumn={sortField}
          direction={sortDirection}
          onToggle={handleSortToggle}
        />
      ),
      accessor: (tournament) =>
        tournament.organizer_name ||
        (tournament.organizer_id != null ? `User #${tournament.organizer_id}` : '—'),
    },
    {
      header: (
        <SortableHeaderCell
          label="Location"
          columnKey="location"
          activeColumn={sortField}
          direction={sortDirection}
          onToggle={handleSortToggle}
        />
      ),
      accessor: (tournament) => tournament.centerName || 'Unknown Center',
    },
    {
      header: (
        <SortableHeaderCell
          label="Start Date"
          columnKey="start_date"
          activeColumn={sortField}
          direction={sortDirection}
          onToggle={handleSortToggle}
        />
      ),
      accessor: (tournament) => formatDateLocalNaive(tournament.start_date),
    },
    {
      header: (
        <SortableHeaderCell
          label="Status"
          columnKey="status"
          activeColumn={sortField}
          direction={sortDirection}
          onToggle={handleSortToggle}
        />
      ),
      accessor: (tournament) => {
        const statusInfo = getTournamentStatusInfo(tournament);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.colorClasses}`}
          >
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (tournament) => (
        <div className="flex space-x-2">
          <Button variant="lightbackground" size="small" onClick={() => openEvent(tournament)}>
            Manage
          </Button>
          <Button
            variant="darkbackground"
            size="small"
            onClick={() => handleDeleteClick(tournament.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const organizerOptions = useMemo(
    () => uniqueTournamentOrganizerOptions(tournaments),
    [tournaments]
  );

  const filteredAndSortedTournaments = useMemo(
    () =>
      filterAndSortTournaments({
        tournaments,
        searchTerm,
        statusFilter,
        organizerFilter,
        sortField,
        sortDirection,
      }),
    [tournaments, searchTerm, statusFilter, organizerFilter, sortField, sortDirection]
  );

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <Breadcrumb
          items={[
            homeCrumb(),
            layoutDashboardCrumb(location.pathname),
            { label: 'Side Action Management' },
          ]}
          className="mb-4"
        />
        <div className="flex justify-between items-center mb-6">
          <PageTitle>Side Action Management</PageTitle>
          <GatedActionButton
            allowed={canCreateSa}
            blockedReason={passBlockReason}
            onClick={() => setIsCreateModalOpen(true)}
            data-guide-id={GUIDE_IDS.CREATE_TOURNAMENT}
          >
            Create SA Event
          </GatedActionButton>
        </div>

        {readOnlyDirector && <DirectorReadOnlyBanner />}

        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}

        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <TableSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Filter by name, TD, location, or status..."
              />
            </div>
            <div>
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'ongoing', label: 'Ongoing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
            <div>
              <Select
                value={organizerFilter}
                onChange={setOrganizerFilter}
                options={[{ value: 'all', label: 'All TDs' }, ...organizerOptions]}
              />
            </div>
          </div>
        </Card>

        <Card>
          <Table
            columns={columns}
            data={filteredAndSortedTournaments}
            keyExtractor={(tournament) => tournament.id}
            isLoading={loading}
            emptyMessage="No side action events found"
            hoverable
            onRowClick={openEvent}
          />
        </Card>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        title="Create SA Event"
        size="large"
        closeOnOutsideClick={false}
      >
        <SideActionEventCreate onClose={handleCreateModalClose} />
      </Modal>

      <ConfirmDialog
        isOpen={tournamentToDelete != null}
        onClose={() => setTournamentToDelete(null)}
        onConfirm={confirmDeleteTournament}
        title="Delete Side Action Event"
        message="Are you sure you want to delete this side action event?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default SideActionManagement;
