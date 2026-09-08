import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DirectorsAPI } from '../../api/directors';
import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import PageTitle from '../../components/common/PageTitle';
import SortableHeaderCell from '../../components/common/SortableHeaderCell';
import DualHorizontalScrollTable from '../../components/common/DualHorizontalScrollTable';
import { SortDirection, toggleSortDirection } from '../../components/common/tableSort';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import {
  formatHouseAverage,
  type TdBowlerAverageRow,
  type TdHouseAverageCenter,
} from '../../types/tdBowlerAverage';

function layoutPrefix(pathname: string): '/admin' | '/director' {
  return pathname.startsWith('/admin') ? '/admin' : '/director';
}

type AverageColumn =
  | 'name'
  | 'usbc'
  | 'last_entering_average'
  | 'highest_entering_average'
  | 'td_average'
  | 'center_average'
  | 'lifetime_average'
  | 'events_bowled';

function compareRows(
  a: TdBowlerAverageRow,
  b: TdBowlerAverageRow,
  column: AverageColumn,
  direction: SortDirection
): number {
  const dir = direction === 'asc' ? 1 : -1;
  const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
  const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
  let cmp = 0;
  if (column === 'name') cmp = nameA.localeCompare(nameB);
  else if (column === 'usbc')
    cmp = (a.usbc_id || '').localeCompare(b.usbc_id || '', undefined, {
      numeric: true,
    });
  else if (column === 'events_bowled') cmp = a.events_bowled - b.events_bowled;
  else {
    const left = a[column];
    const right = b[column];
    if (left == null && right == null) cmp = 0;
    else if (left == null) cmp = 1;
    else if (right == null) cmp = -1;
    else cmp = Number(left) - Number(right);
  }
  if (cmp === 0) cmp = nameA.localeCompare(nameB);
  return cmp * dir;
}

const TdBowlerAveragesPage: React.FC = () => {
  const location = useLocation();
  const prefix = layoutPrefix(location.pathname);
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [centerId, setCenterId] = useState<number | ''>('');
  const [sortColumn, setSortColumn] = useState<AverageColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const query = submitted.trim();
  const selectedCenterId = typeof centerId === 'number' ? centerId : undefined;
  const { data: centers = [] } = useQuery({
    queryKey: ['tdBowlerAverageCenters'],
    queryFn: () => DirectorsAPI.listBowlerAverageCenters(),
  });
  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: ['tdBowlerAverages', query, selectedCenterId ?? null],
    queryFn: () => DirectorsAPI.listBowlerAverages(query || undefined, selectedCenterId),
  });

  const sorted = useMemo(
    () => [...rows].sort((a, b) => compareRows(a, b, sortColumn, sortDirection)),
    [rows, sortColumn, sortDirection]
  );

  const toggleSort = (column: AverageColumn) => {
    if (column === sortColumn) {
      setSortDirection(toggleSortDirection(sortDirection, true));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'name' || column === 'usbc' ? 'asc' : 'desc');
  };

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8 max-w-7xl">
        <Breadcrumb
          items={[
            homeCrumb(),
            layoutDashboardCrumb(location.pathname),
            { label: 'House averages' },
          ]}
          className="mb-4"
        />
        <PageTitle>House averages</PageTitle>
        <p className="text-sm text-text-muted mt-2 mb-6">
          Bowlers who have been on events you organized. TD avg uses only games
          bowled in those events. Last / highest entering are the qualifying
          averages you typed. Lifetime is the Victory platform average. Choose a
          bowling center to filter the list and fill Center avg from games at
          that house.
        </p>

        {error ? (
          <Alert variant="error" message="Could not load house averages." className="mb-4" />
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(search.trim());
          }}
          className="flex flex-col sm:flex-row gap-3 mb-4"
        >
          <div className="flex-1 max-w-md">
            <Input
              label="Filter by name or USBC"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Optional"
              autoComplete="off"
              fullWidth
            />
          </div>
          {centers.length > 0 ? (
            <div className="flex-1 max-w-md">
              <label
                htmlFor="house-average-center"
                className="block mb-1 text-xs sm:text-sm font-semibold text-text-muted uppercase tracking-[0.06em]"
              >
                Bowling center
              </label>
              <select
                id="house-average-center"
                value={centerId === '' ? '' : String(centerId)}
                onChange={(event) => {
                  const next = event.target.value;
                  setCenterId(next ? Number(next) : '');
                }}
                className="block w-full px-3 py-2 sm:py-[9px] bg-surface-light text-text border border-border rounded-input text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary box-border"
              >
                <option value="">All centers</option>
                {centers.map((center: TdHouseAverageCenter) => (
                  <option key={center.id} value={center.id}>
                    {center.city && center.state
                      ? `${center.name} — ${center.city}, ${center.state}`
                      : center.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="sm:pt-6">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium"
            >
              Apply
            </button>
          </div>
        </form>

        {isFetching ? (
          <div className="p-8 flex justify-center">
            <Loading />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-text-muted">
            No bowlers on your organized events yet
            {query || selectedCenterId ? ' match that filter' : ''}.
          </p>
        ) : (
          <DualHorizontalScrollTable>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-text-muted border-b border-border">
                  <th className="px-3 py-2 text-left">
                    <SortableHeaderCell
                      label="Bowler"
                      columnKey="name"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortableHeaderCell
                      label="USBC"
                      columnKey="usbc"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortableHeaderCell
                      label="Last entering"
                      columnKey="last_entering_average"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortableHeaderCell
                      label="Highest used"
                      columnKey="highest_entering_average"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortableHeaderCell
                      label="TD avg"
                      columnKey="td_average"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortableHeaderCell
                      label="Center avg"
                      columnKey="center_average"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortableHeaderCell
                      label="Lifetime"
                      columnKey="lifetime_average"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortableHeaderCell
                      label="Events"
                      columnKey="events_bowled"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.user_id} className="border-b border-border">
                    <td className="px-3 py-2">
                      <Link
                        to={`${prefix}/bowlers/${row.user_id}`}
                        className="text-primary hover:underline"
                      >
                        {row.last_name}, {row.first_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{row.usbc_id || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {formatHouseAverage(row.last_entering_average)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatHouseAverage(row.highest_entering_average)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatHouseAverage(row.td_average)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatHouseAverage(row.center_average)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatHouseAverage(row.lifetime_average)}
                    </td>
                    <td className="px-3 py-2 text-right text-text-muted">
                      {row.events_bowled}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DualHorizontalScrollTable>
        )}
      </div>
    </div>
  );
};

export default TdBowlerAveragesPage;
