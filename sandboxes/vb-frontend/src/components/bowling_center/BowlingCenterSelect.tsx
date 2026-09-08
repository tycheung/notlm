import React, { useMemo } from 'react';
import { BowlingCenterRead } from '../../types/bowling_center';
import SearchableSelect, { SelectOption } from '../common/SearchableSelect';

export const BOWLING_CENTER_EMPTY_OPTION_LABEL = 'Select a bowling center';

/** Shown on the closed combobox when nothing is selected. */
export const BOWLING_CENTER_COMBOBOX_PLACEHOLDER = 'Search for a bowling center...';

export function buildBowlingCenterSelectOptions(
  centers: BowlingCenterRead[] | undefined,
  prependEmpty: boolean
): SelectOption[] {
  const mapped =
    centers?.map((c) => ({
      value: c.id,
      label: `${c.name} - ${c.city}, ${c.state}`,
    })) ?? [];
  if (prependEmpty && mapped.length > 0) {
    return [{ value: '', label: BOWLING_CENTER_EMPTY_OPTION_LABEL }, ...mapped];
  }
  return mapped;
}

interface BowlingCenterSelectProps {
  centers: BowlingCenterRead[] | undefined;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  /**
   * When true and there is at least one center, prepend the empty option.
   * Use false on create flows once a center is chosen so the list matches selection state.
   */
  prependEmptyOption: boolean;
  'data-guide-id'?: string;
}

const BowlingCenterSelect: React.FC<BowlingCenterSelectProps> = ({
  centers,
  value,
  onChange,
  name,
  id,
  className,
  disabled,
  prependEmptyOption,
  'data-guide-id': dataGuideId,
}) => {
  const options = useMemo(
    () => buildBowlingCenterSelectOptions(centers, prependEmptyOption),
    [centers, prependEmptyOption]
  );

  return (
    <SearchableSelect
      id={id}
      name={name}
      value={value ? String(value) : ''}
      onChange={onChange}
      options={options}
      placeholder={BOWLING_CENTER_COMBOBOX_PLACEHOLDER}
      searchInputPlaceholder="Search for a bowling center..."
      className={className}
      disabled={disabled}
      data-guide-id={dataGuideId}
    />
  );
};

export default BowlingCenterSelect;
