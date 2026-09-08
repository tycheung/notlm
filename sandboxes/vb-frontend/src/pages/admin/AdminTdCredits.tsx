import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TdAccessAPI } from '../../api/tdAccess';
import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import PageTitle from '../../components/common/PageTitle';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';

const AdminTdCredits: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminTdUnusedCredits'],
    queryFn: () => TdAccessAPI.adminListCreditHolders(),
  });

  const rows = data?.items ?? [];
  const totalUnused = data?.total_unused ?? 0;

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <Breadcrumb
          items={[
            homeCrumb(),
            layoutDashboardCrumb(location.pathname),
            { label: 'Active credits' },
          ]}
          className="mb-4"
        />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <PageTitle>Active credits</PageTitle>
            <p className="text-sm text-text-muted mt-2">
              Tournament directors and other users who currently hold unused tournament
              credits.
            </p>
          </div>
          <Button
            variant="darkbackground"
            size="small"
            onClick={() => navigate('/admin/grant-credits')}
          >
            Grant credits
          </Button>
        </div>

        {error && (
          <Alert
            variant="error"
            message="Could not load unused credits."
            className="mb-4"
          />
        )}

        <Card className="shadow-sm">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loading />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-text-muted text-center">
              No unused tournament credits are currently held.
            </p>
          ) : (
            <>
              <div className="px-6 py-3 border-b border-border text-sm text-text-muted">
                {totalUnused} unused credit{totalUnused === 1 ? '' : 's'} across{' '}
                {rows.length} account{rows.length === 1 ? '' : 's'}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-primary">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        USBC
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-text uppercase tracking-wider">
                        Unused credits
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-text uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, idx) => (
                      <tr
                        key={row.user_id}
                        className={idx % 2 === 0 ? 'bg-surface' : 'bg-surface-light'}
                      >
                        <td className="px-6 py-4 text-sm text-text whitespace-nowrap">
                          {row.first_name} {row.last_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-muted">
                          {row.email || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">
                          {row.usbc_id || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-text text-right font-medium">
                          {row.unused_credits}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="darkbackground"
                            size="small"
                            onClick={() =>
                              navigate(`/admin/grant-credits?user_id=${row.user_id}`)
                            }
                          >
                            Grant more
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminTdCredits;
