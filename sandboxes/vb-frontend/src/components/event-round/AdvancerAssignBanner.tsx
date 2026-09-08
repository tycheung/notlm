import React from 'react';
import Button from '../common/Button';

type AdvancerAssignBannerProps = {
  unassignedCount: number;
  roundLabel: string;
  onAssignAll: () => void;
};

const AdvancerAssignBanner: React.FC<AdvancerAssignBannerProps> = ({
  unassignedCount,
  roundLabel,
  onAssignAll,
}) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3">
    <p className="text-sm text-text">
      {unassignedCount} advancer
      {unassignedCount === 1 ? '' : 's'} from the prior round{' '}
      {unassignedCount === 1 ? 'is' : 'are'} waiting for{' '}
      <span className="font-medium">{roundLabel}</span>. Assign them to that round&apos;s squad,
      lock it, then generate pods on Format Editor.
    </p>
    <Button type="button" size="small" variant="secondary" onClick={onAssignAll}>
      Assign all to {roundLabel}
    </Button>
  </div>
);

export default AdvancerAssignBanner;
