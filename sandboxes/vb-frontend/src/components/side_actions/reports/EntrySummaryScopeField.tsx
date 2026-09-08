import React from 'react';

export type EntrySummaryScope = 'this' | 'all' | 'all_side_actions';

export function entrySummaryRequiresPool(scope: EntrySummaryScope): boolean {
  return scope === 'this';
}

export function entrySummaryCanPreview(
  scope: EntrySummaryScope,
  poolSelected: boolean
): boolean {
  return scope !== 'this' || poolSelected;
}

export function isEventWideEntrySummaryScope(scope: EntrySummaryScope): boolean {
  return scope === 'all' || scope === 'all_side_actions';
}

interface EntrySummaryScopeFieldProps {
  name: string;
  sideActionName: string;
  thisLabel: string;
  allTypeLabel: string;
  allTypeDescription: string;
  scope: EntrySummaryScope;
  onScopeChange: (scope: EntrySummaryScope) => void;
}

const EntrySummaryScopeField: React.FC<EntrySummaryScopeFieldProps> = ({
  name,
  sideActionName,
  thisLabel,
  allTypeLabel,
  allTypeDescription,
  scope,
  onScopeChange,
}) => (
  <fieldset className="space-y-2">
    <legend className="text-sm font-semibold text-text">Scope</legend>
    <label className="flex items-start gap-2 text-sm text-text">
      <input
        type="radio"
        name={name}
        checked={scope === 'this'}
        onChange={() => onScopeChange('this')}
        className="mt-1"
      />
      <span>
        <span className="font-medium">{thisLabel}</span>
        <span className="block text-text-muted text-xs">{sideActionName}</span>
      </span>
    </label>
    <label className="flex items-start gap-2 text-sm text-text">
      <input
        type="radio"
        name={name}
        checked={scope === 'all'}
        onChange={() => onScopeChange('all')}
        className="mt-1"
      />
      <span>
        <span className="font-medium">{allTypeLabel}</span>
        <span className="block text-text-muted text-xs">{allTypeDescription}</span>
      </span>
    </label>
    <label className="flex items-start gap-2 text-sm text-text">
      <input
        type="radio"
        name={name}
        checked={scope === 'all_side_actions'}
        onChange={() => onScopeChange('all_side_actions')}
        className="mt-1"
      />
      <span>
        <span className="font-medium">All side actions</span>
        <span className="block text-text-muted text-xs">
          One combined entry summary for every side action type on this event.
        </span>
      </span>
    </label>
  </fieldset>
);

export default EntrySummaryScopeField;
