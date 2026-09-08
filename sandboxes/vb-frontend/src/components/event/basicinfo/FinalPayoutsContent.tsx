import React from 'react';
import { useQuery } from '@tanstack/react-query';

import Loading from '../../common/Loading';
import Alert from '../../common/Alert';
import { EventsAPI } from '../../../api/events';
import { getErrorMessage } from '../../../api/apiErrors';

interface FinalPayoutsContentProps {
  eventId: number;
}

const FinalPayoutsContent: React.FC<FinalPayoutsContentProps> = ({ eventId }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['eventFinalPayouts', eventId],
    queryFn: () => EventsAPI.getFinalPayouts(eventId),
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loading size="medium" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        variant="error"
        message={getErrorMessage(error, 'Could not load final payouts.')}
      />
    );
  }

  if (data?.prize_settings_valid === false) {
    return (
      <Alert
        variant="warning"
        message={
          data.prize_validation_error
            ? `Final payout amounts cannot be calculated: ${data.prize_validation_error}`
            : 'Final payout amounts cannot be calculated until prize settings are valid.'
        }
      />
    );
  }

  const nodes = [...(data?.final_nodes || [])].sort(
    (a, b) =>
      (a.display_order ?? 0) - (b.display_order ?? 0) ||
      a.final_node_id - b.final_node_id
  );
  if (!nodes.length) {
    return <p className="text-sm text-text-muted">No final payout data available yet.</p>;
  }

  return (
    <div className="space-y-5">
      {nodes.map((node) => {
        const rows = [...node.rows].sort((a, b) => {
          const rankA = a.global_standings_rank ?? a.placement;
          const rankB = b.global_standings_rank ?? b.placement;
          return rankA - rankB;
        });
        return (
        <div key={node.final_node_id} className="border border-border rounded-lg p-3">
          <div className="mb-2">
            <h4 className="font-semibold text-text">{node.final_node_name}</h4>
            <p className="text-xs text-text-muted">
              Avg per bowler: ${node.average_payout_per_bowler.toFixed(2)} · Total: $
              {node.total_payout.toFixed(2)}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="py-1">Position</th>
                <th className="py-1">Bowler/Team</th>
                <th className="py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="py-1">{row.position_label ?? ''}</td>
                  <td className="py-1">{row.winner?.display_name || 'TBD'}</td>
                  <td className="py-1">${row.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        );
      })}
    </div>
  );
};

export default FinalPayoutsContent;
