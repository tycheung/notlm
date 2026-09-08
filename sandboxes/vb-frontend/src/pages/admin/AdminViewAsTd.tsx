import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DirectorsAPI } from '../../api/directors';
import type { TDSearchUser } from '../../types/director_delegation';
import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import TableSearchInput from '../../components/common/TableSearchInput';
import Loading from '../../components/common/Loading';
import PageTitle from '../../components/common/PageTitle';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { startImpersonation } from '../../utils/impersonationSession';

const AdminViewAsTd: React.FC = () => {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [startingId, setStartingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = submitted.trim();
  const { data: matches = [], isFetching, error: searchError } = useQuery({
    queryKey: ['tdSearch', query],
    queryFn: () => DirectorsAPI.searchTDs(query),
    enabled: query.length >= 1,
  });

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitted(search.trim());
  };

  const emptyHint = useMemo(() => {
    if (query.length < 1) return null;
    if (isFetching) return null;
    if (matches.length === 0) return 'No tournament directors match that search.';
    return null;
  }, [isFetching, matches.length, query]);

  const viewAs = async (row: TDSearchUser) => {
    setError(null);
    setStartingId(row.id);
    try {
      await startImpersonation(row.id);
    } catch (err) {
      console.error(err);
      setStartingId(null);
      setError('Could not start Director View for that TD.');
    }
  };

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8 max-w-3xl">
        <Breadcrumb
          items={[
            homeCrumb(),
            layoutDashboardCrumb(location.pathname),
            { label: 'Director View' },
          ]}
          className="mb-4"
        />
        <PageTitle>Director View</PageTitle>
        <p className="text-sm text-text-muted mt-2 mb-6">
          Choose a tournament director to troubleshoot as them: their dashboard, tournaments, and
          events. A banner lets you return to admin at any time.
        </p>

        {(error || searchError) && (
          <Alert
            variant="error"
            message={error || 'Could not search tournament directors.'}
            className="mb-4"
          />
        )}

        <form onSubmit={runSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <TableSearchInput
              label="Search TDs"
              value={search}
              onChange={setSearch}
              placeholder="Name, email, or USBC"
              omitMargin={false}
            />
          </div>
          <div className="sm:pt-6">
            <Button type="submit" disabled={search.trim().length < 1}>
              Search
            </Button>
          </div>
        </form>

        <Card className="shadow-sm">
          {isFetching ? (
            <div className="p-8 flex justify-center">
              <Loading />
            </div>
          ) : emptyHint ? (
            <p className="p-6 text-sm text-text-muted text-center">{emptyHint}</p>
          ) : matches.length === 0 ? (
            <p className="p-6 text-sm text-text-muted text-center">
              Search for a TD to open Director View as that account.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {matches.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-text">
                      {row.first_name} {row.last_name}
                    </div>
                    <div className="text-xs text-text-muted">
                      {row.usbc_id ? `USBC ${row.usbc_id}` : 'No USBC'}
                      {row.email ? ` · ${row.email}` : ''}
                    </div>
                  </div>
                  <Button
                    variant="darkbackground"
                    size="small"
                    disabled={startingId === row.id}
                    onClick={() => viewAs(row)}
                  >
                    {startingId === row.id ? 'Opening…' : 'View as TD'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminViewAsTd;
