import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { SideActionsAPI } from '../../../api/side-actions';
import { sideActionQueryKeys } from '../../../features/side-actions/shared';

interface ReportPoolScopeFieldProps {
  sideActionId: number;
  value: number | null;
  onChange: (poolId: number | null) => void;
  required?: boolean;
}

const ReportPoolScopeField: React.FC<ReportPoolScopeFieldProps> = ({
  sideActionId,
  value,
  onChange,
  required = false,
}) => {
  const { data = [], isLoading, isSuccess } = useQuery({
    queryKey: sideActionQueryKeys.pools(sideActionId),
    queryFn: () => SideActionsAPI.getSideActionPools(sideActionId),
    enabled: sideActionId > 0,
  });
  const pools = data.filter((pool) => pool.is_enabled);

  useEffect(() => {
    if (!required || !isSuccess) return;
    if (pools.length === 1 && value !== pools[0].id) {
      onChange(pools[0].id);
    } else if (value != null && !pools.some((pool) => pool.id === value)) {
      onChange(null);
    }
  }, [isSuccess, onChange, pools, required, value]);

  if (isLoading) {
    return required ? <p className="text-sm text-text-muted">Loading squad pools…</p> : null;
  }
  if (!pools.length) {
    return required ? (
      <p className="text-sm text-warning">
        No enabled squad pools are available. Enable a squad pool before previewing this report.
      </p>
    ) : null;
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-text">
        Squad pool
      </legend>
      <div className="flex flex-wrap gap-2">
        {!required && (
          <button
            type="button"
            aria-pressed={value === null}
            onClick={() => onChange(null)}
            className="rounded border border-border px-3 py-2 text-sm"
          >
            All squads
          </button>
        )}
        {pools.map((pool) => (
          <button
            key={pool.id}
            type="button"
            aria-pressed={value === pool.id}
            onClick={() => onChange(pool.id)}
            className="rounded border border-border px-3 py-2 text-sm"
          >
            {pool.squad_name}
          </button>
        ))}
      </div>
      {required && (
        <p className="mt-2 text-xs text-text-muted">
          Choose one squad pool for this report. Reports cannot combine bracket pools.
        </p>
      )}
    </fieldset>
  );
};

export default ReportPoolScopeField;
