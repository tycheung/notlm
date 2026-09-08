import React from 'react';
import Input from '../common/Input';
import Label from '../common/Label';

export type HandicapMode = 'scratch' | 'handicap';
export type HandicapSource = 'event_default' | 'manual';

interface HandicapConfigSectionProps {
  handicapMode: HandicapMode;
  onHandicapModeChange: (mode: HandicapMode) => void;
  handicapSource: HandicapSource;
  onHandicapSourceChange: (source: HandicapSource) => void;
  manualBase: number;
  onManualBaseChange: (value: number) => void;
  manualPct: number;
  onManualPctChange: (value: number) => void;
  eventBase: number;
  eventPct: number;
}

const HandicapConfigSection: React.FC<HandicapConfigSectionProps> = ({
  handicapMode,
  onHandicapModeChange,
  handicapSource,
  onHandicapSourceChange,
  manualBase,
  onManualBaseChange,
  manualPct,
  onManualPctChange,
  eventBase,
  eventPct,
}) => {
  return (
    <div className="rounded-md border border-border bg-surface-light p-4">
      <Label>Scoring</Label>
      <div className="mt-2 space-y-2">
        <label className="flex items-center text-sm text-text">
          <input
            type="radio"
            className="mr-2"
            checked={handicapMode === 'scratch'}
            onChange={() => onHandicapModeChange('scratch')}
          />
          Scratch (no handicap)
        </label>
        <label className="flex items-center text-sm text-text">
          <input
            type="radio"
            className="mr-2"
            checked={handicapMode === 'handicap'}
            onChange={() => onHandicapModeChange('handicap')}
          />
          Handicap
        </label>
      </div>
      {handicapMode === 'handicap' && (
        <div className="mt-3 ml-1 space-y-2">
          <label className="flex items-center text-sm text-text">
            <input
              type="radio"
              className="mr-2"
              checked={handicapSource === 'event_default'}
              onChange={() => onHandicapSourceChange('event_default')}
            />
            Use event handicap ({eventBase} @ {eventPct}%)
          </label>
          <label className="flex items-center text-sm text-text">
            <input
              type="radio"
              className="mr-2"
              checked={handicapSource === 'manual'}
              onChange={() => onHandicapSourceChange('manual')}
            />
            Manual handicap settings
          </label>
          {handicapSource === 'manual' && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Input
                label="Base score"
                type="number"
                value={manualBase}
                onChange={(e) => onManualBaseChange(Number(e.target.value) || 0)}
              />
              <Input
                label="Percentage"
                type="number"
                value={manualPct}
                onChange={(e) => onManualPctChange(Number(e.target.value) || 0)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HandicapConfigSection;
