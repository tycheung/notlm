import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SystemAPI, type AdminScheduleEvent } from '../../api/system';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import PageTitle from '../../components/common/PageTitle';
import { formatDateRangeNaive } from '../../utils/dateUtils';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';

type ScheduleKind = 'today' | 'coming-up';

function kindFromPath(pathname: string): ScheduleKind {
  return pathname.includes('coming-up') ? 'coming-up' : 'today';
}

const AdminEventSchedule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const kind = kindFromPath(location.pathname);
  const isToday = kind === 'today';

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminEventWindows'],
    queryFn: () => SystemAPI.getEventWindows(),
  });

  const rows: AdminScheduleEvent[] = isToday
    ? data?.happening_today ?? []
    : data?.coming_up ?? [];

  const title = isToday ? 'Happening Today' : 'Coming Up';
  const emptyMessage = isToday
    ? 'No events are bowling today.'
    : 'No events start in the next 10 days.';

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <Breadcrumb
          items={[
            homeCrumb(),
            layoutDashboardCrumb(location.pathname),
            { label: title },
          ]}
          className="mb-4"
        />
        <PageTitle>{title}</PageTitle>
        <p className="text-sm text-text-muted mt-2 mb-6">
          {isToday
            ? 'Events bowling today across all tournaments.'
            : 'Events that start in the next 10 days, across all tournaments.'}
        </p>

        {error && (
          <Alert variant="error" message="Could not load events." className="mb-4" />
        )}

        <Card className="shadow-sm">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loading />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-text-muted text-center">{emptyMessage}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-primary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Tournament
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, idx) => (
                    <tr
                      key={row.event_id}
                      className={idx % 2 === 0 ? 'bg-surface' : 'bg-surface-light'}
                    >
                      <td className="px-6 py-4 text-sm text-text">{row.event_name}</td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {row.tournament_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">
                        {formatDateRangeNaive(row.start_date, row.end_date)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="darkbackground"
                          size="small"
                          onClick={() => navigate(roleAwareNav.getEventPath(row.event_id))}
                        >
                          Open Event
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminEventSchedule;
