import React from 'react';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  complete: 'Complete',
};

export interface SeriesStatusPillProps {
  status: string;
}

const SeriesStatusPill: React.FC<SeriesStatusPillProps> = ({ status }) => {
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  return (
    <span className="rounded-full border border-border bg-surface-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
      {label}
    </span>
  );
};

export default SeriesStatusPill;
