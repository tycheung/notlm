import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import { BowlingCentersAPI } from '../../api/bowling-centers';
import { BowlingCenterRead } from '../../types/bowling_center';
import { states } from '../../utils/stateAbbreviations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';

// Import custom components
import Button from '../../components/common/Button';
import Table, { Column } from '../../components/common/Table';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import Label from '../../components/common/Label';
import PageTitle from '../../components/common/PageTitle';
import SectionTitle from '../../components/common/SectionTitle';
import Select from '../../components/common/Select';
import TableSearchInput from '../../components/common/TableSearchInput';
import CreateBowlingCenterModal from '../../components/bowling_center/CreateBowlingCenterModal';
import EditBowlingCenterModal from '../../components/bowling_center/EditBowlingCenterModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { sortBowlingCenters } from './bowlingCenterManagementUtils';

const BowlingCenterManagement: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const isMounted = useRef(false);
  
  const [centers, setCenters] = useState<BowlingCenterRead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedCenter, setSelectedCenter] = useState<BowlingCenterRead | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const [centerToDelete, setCenterToDelete] = useState<BowlingCenterRead | null>(null);
  const [modalJustClosed, setModalJustClosed] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useState<{
    search: string;
    state: string;
  }>({
    search: '',
    state: '',
  });
  
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(true);
  const [sortField, setSortField] = useState<'name' | 'city' | 'state' | 'lanes'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Function to fetch bowling centers
  const fetchCenters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await BowlingCentersAPI.getBowlingCenters({
        search: searchParams.search || undefined,
        state: searchParams.state || undefined,
        active_only: showActiveOnly,
      });
      setCenters(data);
    } catch (err) {
      setError('Failed to fetch bowling centers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    isMounted.current = true;
    fetchCenters();
    
    return () => {
      isMounted.current = false;
    };
  }, [showActiveOnly]);
  
  // Refresh data when a modal is closed
  useEffect(() => {
    if (modalJustClosed && isMounted.current) {
      fetchCenters();
      setModalJustClosed(false);
    }
  }, [modalJustClosed]);

  const displayedCenters = useMemo(
    () => sortBowlingCenters(centers, sortField, sortDirection),
    [centers, sortField, sortDirection]
  );

  // Handle edit center
  const handleEditCenter = (center: BowlingCenterRead) => {
    setSelectedCenter(center);
    setIsEditModalOpen(true);
  };

  // Handle delete center
  const handleDeleteCenter = (center: BowlingCenterRead) => {
    setCenterToDelete(center);
    setConfirmDeleteOpen(true);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (!centerToDelete) return;
    
    try {
      await BowlingCentersAPI.deleteBowlingCenter(centerToDelete.id);
      setSuccessMessage(`Bowling center "${centerToDelete.name}" deleted successfully`);
      setCenters(prevCenters => prevCenters.filter(center => center.id !== centerToDelete.id));
    } catch (err) {
      setError('Failed to delete bowling center. Please try again later.');
      console.error('Error deleting center:', err);
    } finally {
      setCenterToDelete(null);
      setConfirmDeleteOpen(false);
    }
  };

  // Custom close handlers that set the modalJustClosed flag
  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setModalJustClosed(true);
  };
  
  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedCenter(null);
    setModalJustClosed(true);
  };

  // Define table columns with proper typing
  const columns: Column<BowlingCenterRead>[] = [
    { header: 'ID', accessor: (center: BowlingCenterRead) => center.id.toString() },
    { header: 'Name', accessor: (center: BowlingCenterRead) => center.name },
    { header: 'Address', accessor: (center: BowlingCenterRead) => 
      center.address2 ? `${center.address1}, ${center.address2}` : center.address1 
    },
    { header: 'City', accessor: (center: BowlingCenterRead) => center.city },
    { header: 'State', accessor: (center: BowlingCenterRead) => center.state },
    { header: 'Lanes', accessor: (center: BowlingCenterRead) => center.lane_count.toString() },
    { header: 'Phone', accessor: (center: BowlingCenterRead) => center.phone || 'N/A' },
    { header: 'Email', accessor: (center: BowlingCenterRead) => 
      center.email ? (
        <a href={`mailto:${center.email}`} className="text-blue-600 hover:underline">
          {center.email}
        </a>
      ) : 'N/A'
    },
    { header: 'Website', accessor: (center: BowlingCenterRead) => 
      center.website ? (
        <a href={center.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {center.website}
        </a>
      ) : 'N/A'
    },
    { header: 'Active', accessor: (center: BowlingCenterRead) => 
      center.is_active ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      ) : (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Inactive
        </span>
      )
    },
    { header: 'Actions', accessor: (center: BowlingCenterRead) => (
      <div className="flex space-x-2">
        <Button
          variant="lightbackground"
          size="small"
          onClick={() => handleEditCenter(center)}
        >
          Edit
        </Button>
        {isAdmin && (
          <Button
            variant="darkbackground"
            size="small"
            onClick={() => handleDeleteCenter(center)}
          >
            Delete
          </Button>
        )}
      </div>
    )}
  ];

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <Breadcrumb
          items={[homeCrumb(), layoutDashboardCrumb(location.pathname), { label: 'Bowling centers' }]}
          className="mb-4"
        />
        <div className="flex justify-between items-center mb-6">
          <PageTitle>Bowling Center Management</PageTitle>
        </div>

        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}

        {successMessage && (
          <Alert
            variant="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
            className="mb-4"
          />
        )}

        {/* Search form */}
        <Card 
          title="Search Bowling Centers"
          className="mb-6"
        >
          <div className="flex flex-wrap items-start -mx-2">
              <div className="w-full sm:w-5/12 px-2 mb-3 flex flex-col">
                <TableSearchInput
                  label="Search by name or city"
                  value={searchParams.search}
                  onChange={(value: string) =>
                    setSearchParams({ ...searchParams, search: value })}
                  placeholder="Search by name or city"
                  omitMargin={false}
                />
              </div>
              <div className="w-full sm:w-5/12 px-2 mb-3 flex flex-col">
                <Label htmlFor="state-select">
                  State
                </Label>
                <select
                  id="state-select"
                  name="state"
                  value={searchParams.state}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                    setSearchParams({...searchParams, state: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary h-[42px]"
                >
                  <option value="">All States</option>
                  {states.map((state) => (
                    <option key={state.abbreviation} value={state.abbreviation}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-2/12 px-2 mb-3 flex flex-col gap-2">
                <Select
                  value={sortField}
                  onChange={(value) => setSortField(value as typeof sortField)}
                  options={[
                    { value: 'name', label: 'Sort: Name' },
                    { value: 'city', label: 'Sort: City' },
                    { value: 'state', label: 'Sort: State' },
                    { value: 'lanes', label: 'Sort: Lanes' },
                  ]}
                />
                <Select
                  value={sortDirection}
                  onChange={(value) => setSortDirection(value as typeof sortDirection)}
                  options={[
                    { value: 'asc', label: 'Asc' },
                    { value: 'desc', label: 'Desc' },
                  ]}
                />
              </div>
            </div>
            
            <div className="flex items-center mt-3">
              <Label className="flex items-center text-sm mb-0 cursor-pointer">
                <input
                  type="checkbox"
                  id="active-only"
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
                  checked={showActiveOnly}
                  onChange={() => setShowActiveOnly(!showActiveOnly)}
                />
                Show active centers only
              </Label>
            </div>
        </Card>

        {/* Bowling centers table */}
        <Card>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <SectionTitle size="large">Bowling Centers</SectionTitle>
            <Button 
              variant="darkbackground" 
              size="medium" 
              onClick={() => setIsCreateModalOpen(true)}
            >
              <span className="flex items-center">
                <AddIcon className="mr-1" /> Add Bowling Center
              </span>
            </Button>
          </div>
          <Table
            columns={columns}
            data={displayedCenters}
            keyExtractor={(center) => center.id}
            isLoading={loading}
            emptyMessage="No bowling centers found"
            hoverable
          />
        </Card>

        {/* Modals */}
        <CreateBowlingCenterModal
          isOpen={isCreateModalOpen}
          onClose={handleCreateModalClose}
          onSuccess={() => {
            setSuccessMessage('Bowling center added successfully');
            setIsCreateModalOpen(false);
            setModalJustClosed(true);
          }}
        />

        <EditBowlingCenterModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          onSuccess={() => {
            setSuccessMessage('Bowling center updated successfully');
            setIsEditModalOpen(false);
            setSelectedCenter(null);
            setModalJustClosed(true);
          }}
          bowlingCenter={selectedCenter}
        />

        <ConfirmDialog
          isOpen={confirmDeleteOpen}
          title="Delete Bowling Center"
          message={`Are you sure you want to delete ${centerToDelete?.name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onClose={() => {
            setConfirmDeleteOpen(false);
            setCenterToDelete(null);
          }}
        />
      </div>
    </div>
  );
};

export default BowlingCenterManagement; 
