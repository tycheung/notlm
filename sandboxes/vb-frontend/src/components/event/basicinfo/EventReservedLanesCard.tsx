import React, { useEffect, useState } from 'react';
import EditableCard from '../../common/EditableCard';
import { EventComplete } from '../../../types/event';

interface EventReservedLanesCardProps {
  eventComplete: EventComplete;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
}

const EventReservedLanesCard: React.FC<EventReservedLanesCardProps> = ({
  eventComplete,
  isAuthorizedToEdit,
  onSave,
}) => {
  const EditContent: React.FC<{
    initialExpression: string;
    setSaveData: (data: Record<string, unknown>) => void;
  }> = ({ initialExpression, setSaveData }) => {
    const [expression, setExpression] = useState(initialExpression);

    useEffect(() => {
      setSaveData({
        reserved_lanes_expression: expression.trim() ? expression : null,
      });
    }, [expression, setSaveData]);

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text" htmlFor="event_reserved_lanes_expression">
          Reserved Lanes Expression
        </label>
        <textarea
          id="event_reserved_lanes_expression"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-surface-light px-3 py-2 text-text shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
          placeholder="4-6, 8-10; 12-22"
        />
        <p className="text-xs text-text-muted">
          Applies event-wide. Round and squad settings can still override this value.
        </p>
      </div>
    );
  };

  const expression = eventComplete.reserved_lanes_expression?.trim() || '';

  return (
    <EditableCard
      title="Reserved Lanes"
      canEdit={isAuthorizedToEdit}
      onSave={onSave}
      editContent={(setSaveData) => (
        <EditContent
          setSaveData={setSaveData}
          initialExpression={expression}
        />
      )}
    >
      <div className="space-y-2 text-text">
        <p>
          <span className="font-medium text-text">Reserved Lanes:</span>{' '}
          <span className="text-text-muted">{expression || 'None'}</span>
        </p>
        <p className="text-xs text-text-muted">
          Priority: Tournament defaults -&gt; Event-wide reserved lanes -&gt; Round reserved lanes
          -&gt; Squad/game overrides.
        </p>
      </div>
    </EditableCard>
  );
};

export default EventReservedLanesCard;
