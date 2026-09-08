import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { TdAccessAPI } from '../../api/tdAccess';
import { UsersAPI } from '../../api/users';
import type { UserRead } from '../../types/user';
import { Role } from '../../types/user';
import PageTitle from '../../components/common/PageTitle';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import TableSearchInput from '../../components/common/TableSearchInput';
import Alert from '../../components/common/Alert';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { roleDisplayLabel } from '../../utils/roles';
import { matchesGrantCreditUserSearch } from './grantCreditsUserSearch';

function userSummary(user: UserRead): string {
  const name = `${user.first_name} ${user.last_name}`.trim();
  const usbc = user.usbc_id ? `USBC ${user.usbc_id}` : null;
  const email = user.email || null;
  return [name, usbc, email].filter(Boolean).join(' · ');
}

const AdminGrantCreditsPage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectId = Number(searchParams.get('user_id') || '');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserRead | null>(null);
  const [count, setCount] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: directory = [], isLoading: isDirectoryLoading } = useQuery({
    queryKey: ['adminDirectoryUsers'],
    queryFn: () => UsersAPI.listDirectoryUsers(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!Number.isFinite(preselectId) || preselectId < 1 || directory.length === 0) {
      return;
    }
    const found = directory.find((user) => user.id === preselectId);
    if (found) setSelected(found);
  }, [directory, preselectId]);

  const matches = useMemo(() => {
    const query = search.trim();
    if (query.length < 2) return [] as UserRead[];
    return directory.filter((user) => matchesGrantCreditUserSearch(user, query)).slice(0, 20);
  }, [directory, search]);

  const selectUser = (user: UserRead) => {
    setSelected(user);
    setSearch('');
    setError(null);
    setSuccess(null);
  };

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selected) {
      setError('Search and select a user first.');
      return;
    }
    const n = Number(count);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      setError('Count must be 1–50.');
      return;
    }
    setSaving(true);
    try {
      const result = await TdAccessAPI.adminGrantCredits(selected.id, n);
      setSuccess(
        `Granted ${result.granted} credit(s) to ${userSummary(selected)}. Unused now: ${result.unused_credits}.`
      );
    } catch (err) {
      console.error(err);
      setError('Grant failed. Try another user or check the API and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8 max-w-2xl">
        <Breadcrumb
          items={[
            homeCrumb(),
            layoutDashboardCrumb(location.pathname),
            { label: 'Grant credits' },
          ]}
          className="mb-4"
        />
        <PageTitle>Grant tournament credits</PageTitle>
        <p className="text-sm text-text-muted mt-2 mb-4">
          Search a signed-up user by first name, last name, or USBC ID, then grant credits.{' '}
          <Link to="/admin/td-credits" className="text-primary">
            Review unused credits
          </Link>
        </p>
        {error && <Alert variant="error" message={error} className="mb-3" />}
        {success && <Alert variant="success" message={success} className="mb-3" />}
        <form onSubmit={grant} className="space-y-4 bg-surface border border-border rounded-lg p-4">
          <div>
            <TableSearchInput
              label="Search user"
              value={search}
              onChange={setSearch}
              placeholder="First name, last name, or USBC ID"
              omitMargin={false}
            />
            {isDirectoryLoading && search.trim().length >= 2 && (
              <div className="mt-2">
                <Loading size="small" />
              </div>
            )}
            {!isDirectoryLoading && search.trim().length >= 2 && matches.length === 0 && (
              <p className="text-sm text-text-muted mt-2">No registered users match that search.</p>
            )}
            {matches.length > 0 && (
              <ul className="mt-2 border border-border rounded-md divide-y divide-border max-h-64 overflow-y-auto">
                {matches.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-surface-light"
                      onClick={() => selectUser(user)}
                    >
                      <div className="text-sm font-medium text-text">
                        {user.first_name} {user.last_name}
                        <span className="ml-2 text-xs text-text-muted">{roleDisplayLabel(user.role)}</span>
                      </div>
                      <div className="text-xs text-text-muted">
                        {user.usbc_id ? `USBC ${user.usbc_id}` : 'No USBC'}
                        {user.email ? ` · ${user.email}` : ''}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected && (
            <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface-light px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-[0.06em]">
                  Selected
                </p>
                <p className="text-sm text-text">{userSummary(selected)}</p>
              </div>
              <Button
                type="button"
                variant="lightbackground"
                size="small"
                onClick={() => setSelected(null)}
              >
                Clear
              </Button>
            </div>
          )}

          <Input
            label="Count"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            inputMode="numeric"
          />
          <Button type="submit" disabled={saving || !selected}>
            {saving ? 'Granting…' : 'Grant credits'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminGrantCreditsPage;
