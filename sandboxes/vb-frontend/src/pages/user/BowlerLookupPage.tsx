import React, { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DirectorsAPI } from '../../api/directors';
import { UsersAPI } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import type { TDSearchUser } from '../../types/director_delegation';
import { Role } from '../../types/user';
import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import PageTitle from '../../components/common/PageTitle';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { roleDisplayLabel } from '../../utils/roles';
import BowlerHistoryView from './BowlerHistoryView';

function layoutPrefix(pathname: string): '/admin' | '/director' {
  return pathname.startsWith('/admin') ? '/admin' : '/director';
}

const BowlerLookupPage: React.FC = () => {
  const location = useLocation();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const prefix = layoutPrefix(location.pathname);
  const isAdmin = user?.role === Role.ADMIN;
  const parsedId = userId ? Number(userId) : NaN;
  const viewingId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;

  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');

  const query = submitted.trim();
  const { data: matches = [], isFetching, error: searchError } = useQuery({
    queryKey: ['bowlerLookup', query],
    queryFn: () => DirectorsAPI.searchBowlers(query),
    enabled: query.length >= 2 && viewingId === null,
  });

  const { data: subject, isLoading: isSubjectLoading, error: subjectError } = useQuery({
    queryKey: ['bowlerLookupUser', viewingId],
    queryFn: () => UsersAPI.getUser(viewingId as number),
    enabled: viewingId !== null,
  });

  const financialEmpty = isAdmin
    ? 'No approved event registrations yet.'
    : 'No financials from events you ran. Scores from other directors’ events still show on Scores.';

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(search.trim());
  };

  const resultHint = useMemo(() => {
    if (query.length < 2) return null;
    if (isFetching) return null;
    if (matches.length === 0) return 'No bowlers match that name or USBC ID.';
    return null;
  }, [isFetching, matches.length, query]);

  if (viewingId !== null) {
    return (
      <div className="py-6">
        <div className="mx-auto px-4 sm:px-6 md:px-8 max-w-7xl">
          <Breadcrumb
            items={[
              homeCrumb(),
              layoutDashboardCrumb(location.pathname),
              { label: 'Bowler lookup', path: `${prefix}/bowlers` },
              { label: subject ? `${subject.first_name} ${subject.last_name}` : 'Bowler' },
            ]}
            className="mb-4"
          />
          {isSubjectLoading ? (
            <div className="p-8 flex justify-center">
              <Loading />
            </div>
          ) : subjectError || !subject ? (
            <Alert variant="error" message="Could not load that bowler." />
          ) : (
            <>
              <div className="mb-6">
                <PageTitle>
                  {subject.first_name} {subject.last_name}
                </PageTitle>
                <p className="text-sm text-text-muted mt-2">
                  {[
                    roleDisplayLabel(subject.role),
                    subject.usbc_id ? `USBC ${subject.usbc_id}` : null,
                    subject.email,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {!isAdmin && (
                  <p className="text-sm text-text-muted mt-2">
                    Financials only include events you ran. Score history includes every event this
                    bowler has posted games in.
                  </p>
                )}
              </div>
              <BowlerHistoryView
                subjectUserId={subject.id}
                showReport={false}
                financialEmptyMessage={financialEmpty}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8 max-w-3xl">
        <Breadcrumb
          items={[
            homeCrumb(),
            layoutDashboardCrumb(location.pathname),
            { label: 'Bowler lookup' },
          ]}
          className="mb-4"
        />
        <PageTitle>Bowler lookup</PageTitle>
        <p className="text-sm text-text-muted mt-2 mb-6">
          Search by first name, last name, or USBC ID. Open a bowler to see score history
          {isAdmin
            ? ' and all financials.'
            : '. Financials are limited to events you ran.'}{' '}
          For house averages across your events, use{' '}
          <Link to={`${prefix}/averages`} className="text-primary hover:underline">
            House averages
          </Link>
          .
        </p>

        {searchError && (
          <Alert variant="error" message="Could not search bowlers." className="mb-4" />
        )}

        <form onSubmit={runSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              label="Name or USBC ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="At least 2 characters"
              autoComplete="off"
              fullWidth
            />
          </div>
          <div className="sm:pt-6">
            <Button type="submit" disabled={search.trim().length < 2}>
              Search
            </Button>
          </div>
        </form>

        <Card className="shadow-sm">
          {isFetching ? (
            <div className="p-8 flex justify-center">
              <Loading />
            </div>
          ) : resultHint ? (
            <p className="p-6 text-sm text-text-muted text-center">{resultHint}</p>
          ) : matches.length === 0 ? (
            <p className="p-6 text-sm text-text-muted text-center">
              Enter a name or USBC ID to look up a bowler.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {matches.map((row: TDSearchUser) => (
                <li key={row.id}>
                  <Link
                    to={`${prefix}/bowlers/${row.id}`}
                    className="block px-4 py-3 hover:bg-surface-light"
                  >
                    <div className="text-sm font-medium text-text">
                      {row.first_name} {row.last_name}
                    </div>
                    <div className="text-xs text-text-muted">
                      {row.usbc_id ? `USBC ${row.usbc_id}` : 'No USBC'}
                      {row.email ? ` · ${row.email}` : ''}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BowlerLookupPage;
