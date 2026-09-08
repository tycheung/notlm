import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserRead, Role } from '../../types/user';
import { UsersAPI } from '../../api/users';

// Import custom components
import Button from '../../components/common/Button';
import Table, { Column } from '../../components/common/Table';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import TableSearchInput from '../../components/common/TableSearchInput';
import CreateUserModal from '../../components/admin/CreateUserModal';
import CreateMinimalUserModal from '../../components/admin/CreateMinimalUserModal';
import EditUserModal from '../../components/admin/EditUserModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { formatDirectorIdentity } from '../../utils/directorIdentity';
import { startImpersonation } from '../../utils/impersonationSession';

const UserManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterVerification, setFilterVerification] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCreateMinimalModalOpen, setIsCreateMinimalModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserRead | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalJustClosed, setModalJustClosed] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const isMounted = useRef(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await UsersAPI.listDirectoryUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users. Please try again later.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchUsers();
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Refresh data when a modal is closed
  useEffect(() => {
    if (modalJustClosed && isMounted.current) {
      fetchUsers();
      setModalJustClosed(false);
    }
  }, [modalJustClosed]);

  // Custom close handlers that set the modalJustClosed flag
  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setModalJustClosed(true);
  };
  
  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
    setModalJustClosed(true);
  };

  // Filter users based on search term, role filter, and verification status
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      searchTerm === '' || 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.usbc_id ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === '' || user.role === filterRole;
    
    const matchesVerification = 
      filterVerification === '' || 
      (filterVerification === 'verified' && user.is_verified) ||
      (filterVerification === 'unverified' && !user.is_verified);
    
    return matchesSearch && matchesRole && matchesVerification;
  });

  const getRoleBadgeClass = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case Role.TD:
        return 'bg-blue-100 text-blue-800';
      case Role.SA:
        return 'bg-amber-100 text-amber-800';
      case Role.BOWLER:
        return 'bg-green-100 text-green-800';
      case Role.GUEST:
        return 'bg-surface-light text-text';
      default:
        return 'bg-surface-light text-text';
    }
  };

  const getFormattedRoleName = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'Admin';
      case Role.TD:
        return 'Tournament Director';
      case Role.SA:
        return 'Side Action Only';
      case Role.BOWLER:
        return 'Bowler';
      case Role.GUEST:
        return 'Guest';
      default:
        return role;
    }
  };

  const handleDeleteUserClick = (userId: number) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete == null) return;
    const userId = userToDelete;
    setUserToDelete(null);
    try {
      await UsersAPI.deleteUser(userId);
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
      setSuccessMessage('User deleted successfully');
    } catch (err) {
      setError('Failed to delete user. Please try again later.');
      console.error('Error deleting user:', err);
    }
  };

  const handleVerifyUser = async (userId: number) => {
    try {
      const updatedUser = await UsersAPI.verifyUser(userId);
      // Update the users list with the verified user
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? updatedUser : user
        )
      );
      setSuccessMessage('User verified successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to verify user. Please try again later.');
      console.error('Error verifying user:', err);
    }
  };

  const handleEditUser = (user: UserRead) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  // Get counts for unverified users
  const unverifiedCount = users.filter(user => !user.is_verified).length;

  // Define table columns
  const columns: Column<UserRead>[] = [
    { 
      header: 'Name', 
      accessor: (user) => (
        <div>
          <div className="text-sm font-medium text-text">
            {formatDirectorIdentity(user)}
          </div>
          <div className="text-sm text-text-muted">
            ID: {user.id}
          </div>
        </div>
      )
    },
    { 
      header: 'Email / USBC ID', 
      accessor: (user) => (
        <div>
          <div className="text-sm text-text">{user.email}</div>
          <div className="text-sm text-text-muted">
            USBC: {user.usbc_id}
            {!user.is_verified && user.usbc_id && (
              <span className="ml-2 text-yellow-600 font-medium">(Needs verification)</span>
            )}
          </div>
        </div>
      )
    },
    { 
      header: 'Role', 
      accessor: (user) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
          {getFormattedRoleName(user.role)}
        </span>
      )
    },
    { 
      header: 'Status', 
      accessor: (user) => (
        <div className="flex flex-col text-sm">
          <span className={`inline-flex items-center ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
          <span className={`inline-flex items-center ${user.is_verified ? 'text-green-600' : 'text-yellow-600'} font-medium`}>
            {user.is_verified ? 'Verified' : 'Unverified'}
          </span>
        </div>
      )
    },
    { 
      header: 'Actions', 
      accessor: (user) => (
        <div className="flex space-x-2">
          <Button
            variant="lightbackground"
            size="small"
            onClick={() => navigate(`/admin/bowlers/${user.id}`)}
          >
            View
          </Button>
          <Button
            variant="lightbackground"
            size="small"
            onClick={() => handleEditUser(user)}
          >
            Edit
          </Button>
          {(user.role === Role.TD || user.role === Role.SA) && (
            <Button
              variant="lightbackground"
              size="small"
              onClick={() => startImpersonation(user.id).catch(() => {
                setError(
                  user.role === Role.SA
                    ? 'Could not start Director View for that SA user.'
                    : 'Could not start Director View for that TD.'
                );
              })}
            >
              {user.role === Role.SA ? 'View as SA' : 'View as TD'}
            </Button>
          )}
          {!user.is_verified && (
            <button
              className="text-green-600 hover:text-green-900 font-bold mr-3 px-3 py-1 border border-green-600 rounded hover:bg-success/15"
              onClick={() => handleVerifyUser(user.id)}
            >
              Verify USBC ID
            </button>
          )}
          <Button
            variant="darkbackground"
            size="small"
            onClick={() => handleDeleteUserClick(user.id)}
          >
            Delete
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <Breadcrumb
          items={[homeCrumb(), layoutDashboardCrumb(location.pathname), { label: 'Users' }]}
          className="mb-4"
        />
        <div className="flex justify-between items-center mb-6">
          <div>
            <PageTitle>User Management</PageTitle>
            <p className="text-sm text-text-muted mt-1">
              Signed-up accounts only. Unclaimed bowlers/participants stay off this list until they
              register and claim a USBC ID.
            </p>
            {unverifiedCount > 0 && (
              <p className="text-yellow-600 mt-1">
                {unverifiedCount} user{unverifiedCount > 1 ? 's' : ''} {unverifiedCount > 1 ? 'need' : 'needs'} verification
              </p>
            )}
          </div>
        </div>

        {successMessage && (
          <Alert
            variant="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
            className="mb-4"
          />
        )}

        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}

        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center">
              <div className="w-full sm:w-72 min-w-0">
                <TableSearchInput
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
              </div>
              <select
                className="px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary h-[42px]"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value={Role.ADMIN}>Admin</option>
                <option value={Role.TD}>Tournament Director</option>
                <option value={Role.SA}>Side Action Only</option>
                <option value={Role.BOWLER}>Bowler</option>
                <option value={Role.GUEST}>Guest</option>
              </select>
              <select
                className="px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary h-[42px]"
                value={filterVerification}
                onChange={(e) => setFilterVerification(e.target.value)}
              >
                <option value="">All Verification Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="darkbackground"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-[42px]"
              >
                Add New User
              </Button>
              <Button
                variant="lightbackground"
                onClick={() => setIsCreateMinimalModalOpen(true)}
                className="h-[42px]"
              >
                Add Minimal User
              </Button>
            </div>
          </div>

          <Table
            columns={columns}
            data={filteredUsers}
            keyExtractor={(user) => user.id}
            isLoading={loading}
            emptyMessage="No registered users found matching your criteria."
            hoverable
          />
        </Card>
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        onSuccess={() => {
          setSuccessMessage('User created successfully');
          setIsCreateModalOpen(false);
          setModalJustClosed(true);
        }}
      />

      <CreateMinimalUserModal
        isOpen={isCreateMinimalModalOpen}
        onClose={() => setIsCreateMinimalModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage('Minimal user created successfully');
          setIsCreateMinimalModalOpen(false);
          setModalJustClosed(true);
        }}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSuccess={() => {
          setSuccessMessage('User updated successfully');
          setIsEditModalOpen(false);
          setSelectedUser(null);
          setModalJustClosed(true);
        }}
        user={selectedUser}
      />

      <ConfirmDialog
        isOpen={userToDelete != null}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDeleteUser}
        title="Delete user"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default UserManagement;
