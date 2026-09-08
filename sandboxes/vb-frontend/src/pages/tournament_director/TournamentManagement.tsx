import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
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
import SortableHeaderCell from '../../components/common/SortableHeaderCell';
import { toggleSortDirection } from '../../components/common/tableSort';
import TableSearchInput from '../../components/common/TableSearchInput';
import { useAuth } from '../../contexts/AuthContext';
import { isSaOnlyRole } from '../../utils/roles';
import { Role } from '../../types/user';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import TournamentCreate from '../tournaments/TournamentCreate';
import { getTournamentStatusInfo } from '../../utils/tournamentStatus';
import { formatDateLocalNaive } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { filterAndSortTournaments, getTournamentManagementPaths, uniqueTournamentOrganizerOptions } from './tournamentManagementUtils';
import { partitionSaOnlyTournaments } from '../../utils/saOnly';
import {
  canCreateFullTournament,
  canCreateSaEvent,
  isDirectorReadOnly,
} from '../../api/tdAccess';
import DirectorReadOnlyBanner from '../../components/billing/DirectorReadOnlyBanner';
import GatedActionButton from '../../components/billing/GatedActionButton';
import { GUIDE_IDS, useGuideModal } from '../../features/director-guide';

const TournamentManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tournaments, setTournaments] = useState<(TournamentRead & { centerName?: string; centerCity?: string; centerState?: string })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalJustClosed, setModalJustClosed] = useState<boolean>(false);
  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  useGuideModal('tournamentCreate', openCreateModal);
  const [tournamentToDelete, setTournamentToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'>('all');
  const [organizerFilter, setOrganizerFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'start_date' | 'end_date' | 'location' | 'status' | 'td'>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const isMounted = useRef(false);
  const { user } = useAuth();
  const canCreateFull = canCreateFullTournament(user?.billing);
  const readOnlyDirector = isDirectorReadOnly(user?.billing);
  const passBlockReason =
    'A Tournament Director subscription or unused tournament pass is required.';


  if (isSaOnlyRole(user?.role)) {
    return <Navigate to="/director" replace />;
  }
  
  const getEditPath = (tournamentId: number) =>
    getTournamentManagementPaths(user?.role, tournamentId).editPath;

  const getDetailsPath = (tournamentId: number) =>
    getTournamentManagementPaths(user?.role, tournamentId).detailsPath;
  
  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const response =
        user?.role === Role.TD || user?.role === Role.SA
          ? await DirectorsAPI.getMyTournaments()
          : await TournamentsAPI.getTournaments({ active_only: false });
      const { full } = partitionSaOnlyTournaments(response);
      
      // Fetch all bowling centers in one call
      const allBowlingCenters = await BowlingCentersAPI.getBowlingCenters();
      
      // Create a lookup map for bowling centers
      const bowlingCenterMap = new Map<number, BowlingCenterRead>(
        allBowlingCenters.map((center: BowlingCenterRead) => [center.id, center])
      );
      
      // Add bowling center details to tournaments
      const tournamentsWithCenterDetails = full.map(tournament => {
        const bowlingCenter = bowlingCenterMap.get(tournament.bowling_center_id);
        return {
          ...tournament,
          centerName: bowlingCenter?.name || 'Unknown Center',
          centerCity: bowlingCenter?.city || 'Unknown',
          centerState: bowlingCenter?.state || 'Unknown'
        };
      });
      
      setTournaments(tournamentsWithCenterDetails);
      setError(null);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError('Failed to load tournaments. Please log out and back in again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Log current user info to debug
    
    isMounted.current = true;
    fetchTournaments();
    
    return () => {
      isMounted.current = false;
    };
  }, [user]);
  
  // Refresh data when a modal is closed
  useEffect(() => {
    if (modalJustClosed && isMounted.current) {
      fetchTournaments();
      setModalJustClosed(false);
    }
  }, [modalJustClosed]);
  
  // Custom close handlers that set the modalJustClosed flag
  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setModalJustClosed(true);
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
      setError('Failed to delete tournament');
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

  type TournamentRow = TournamentRead & {
    centerName?: string;
    centerCity?: string;
    centerState?: string;
  };

  // Define table columns
  const columns: Column<TournamentRow>[] = [
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
      accessor: (tournament) => tournament.name,
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
      header: 'City/State',
      accessor: (tournament) => 
        tournament.centerCity && tournament.centerState 
          ? `${tournament.centerCity}, ${tournament.centerState}`
          : 'Unknown'
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
      accessor: (tournament) => formatDateLocalNaive(tournament.start_date)
    },
    { 
      header: (
        <SortableHeaderCell
          label="End Date"
          columnKey="end_date"
          activeColumn={sortField}
          direction={sortDirection}
          onToggle={handleSortToggle}
        />
      ),
      accessor: (tournament) => formatDateLocalNaive(tournament.end_date)
    },
    { 
      header: 'Lanes Reserved', 
      accessor: (tournament) => tournament.lanes_reserved.toString() 
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
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.colorClasses}`}>
            {statusInfo.label}
          </span>
        );
      }
    },
    { 
      header: 'Actions', 
      accessor: (tournament) => (
        <div className="flex space-x-2">
          <Button
            variant="lightbackground"
            size="small"
            onClick={() => navigate(getDetailsPath(tournament.id))}
          >
            Details/Manage
          </Button>
          <Button
            variant="darkbackground"
            size="small"
            onClick={() => handleDeleteClick(tournament.id)}
          >
            Delete
          </Button>
        </div>
      )
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
          items={[homeCrumb(), layoutDashboardCrumb(location.pathname), { label: 'Tournaments' }]}
          className="mb-4"
        />
        <div className="flex justify-between items-center mb-6">
          <PageTitle>Tournament Management</PageTitle>
          <GatedActionButton
            allowed={canCreateFull}
            blockedReason={passBlockReason}
            onClick={() => setIsCreateModalOpen(true)}
            data-guide-id={GUIDE_IDS.CREATE_TOURNAMENT}
          >
            Create Tournament
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
                placeholder="Filter tournaments by name, TD, location, or status..."
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
                options={[
                  { value: 'all', label: 'All TDs' },
                  ...organizerOptions,
                ]}
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
            emptyMessage="No tournaments found"
            hoverable
          />
        </Card>
      </div>

      {/* Create Tournament Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        title="Create New Tournament"
        size="large"
        closeOnOutsideClick={false}
      >
        <TournamentCreate onClose={handleCreateModalClose} />
      </Modal>

      <ConfirmDialog
        isOpen={tournamentToDelete != null}
        onClose={() => setTournamentToDelete(null)}
        onConfirm={confirmDeleteTournament}
        title="Delete Tournament"
        message="Are you sure you want to delete this tournament?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default TournamentManagement; 
