import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { normalizeRoundStatus } from '../../../../utils/statusUtils';
import { getCompetitionMethodDisplayLabel } from '../../../../utils/competitionMethodDisplay';

interface TournamentRoundNodeData {
  round_id: number;
  round_number: number;
  round_name?: string;
  friendly_name?: string;
  status: string;
  participant_count: number;
  advancement_count: number;
  is_initial: boolean;
  is_final: boolean;
  allows_reentry?: boolean;
  has_game_conflict?: boolean;
  onMergeWarningClick?: (roundId: number) => void;
  competition_method?: string;
  competition_method_display_label?: string;
  hideParticipantCount?: boolean;
}

const TournamentRoundNode: React.FC<NodeProps> = ({ 
  data, 
  isConnectable, 
  selected 
}) => {
  const nodeData = data as any;
  const round_name = nodeData?.round_name;
  const friendly_name = nodeData?.friendly_name;
  const status = nodeData?.status || 'scheduled';
  const participant_count = nodeData?.participant_count || 0;
  const advancement_count = nodeData?.advancement_count || 0;
  const is_initial = nodeData?.is_initial || false;
  const is_final = nodeData?.is_final || false;
  const allows_reentry = nodeData?.allows_reentry || false;
  const hasGameConflict = Boolean(nodeData?.has_game_conflict);
  const competitionMethodLabel = String(
    nodeData?.competition_method_display_label ||
      getCompetitionMethodDisplayLabel(String(nodeData?.competition_method || 'eliminator'))
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (normalizeRoundStatus(status)) {
      case 'completed': return 'bg-green-100 border-green-500 text-green-800';
      case 'in_progress': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 border-blue-500 text-blue-800';
      case 'cancelled': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-surface-light border-gray-500 text-text';
    }
  };

  // Get node type indicator
  const getNodeTypeIndicator = () => {
    if (is_initial) return '🏁';
    if (is_final) return '🏆';
    return '⚽';
  };

  return (
    <div 
      className={`
        tournament-round-node px-6 py-4 rounded-lg border-2 min-w-[280px] max-w-[320px]
        ${getStatusColor(status)}
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        shadow-md hover:shadow-lg transition-all duration-200
        cursor-pointer
        group
      `}
      title="Double-click to edit round settings and squads"
    >
      {/* Input handles - multiple positions for different relationships */}
      {!is_initial && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="target-top"
            isConnectable={isConnectable}
            className="w-4 h-4 border-2 border-white"
            style={{ top: '30%' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="target-center"
            isConnectable={isConnectable}
            className="w-4 h-4 border-2 border-white"
            style={{ top: '50%' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="target-bottom"
            isConnectable={isConnectable}
            className="w-4 h-4 border-2 border-white"
            style={{ top: '70%' }}
          />
        </>
      )}

      {/* Node content */}
      <div className="text-center">
        {/* Node type indicator */}
        <div className="text-2xl mb-2">
          {getNodeTypeIndicator()}
        </div>
        
        {/* Double-click hint */}
        <div className="text-xs text-text-muted mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
          Double-click to edit
        </div>

        {/* Round name with re-entry icon */}
        <div className="font-semibold text-lg mb-3 leading-tight flex items-center justify-center">
          <span>{friendly_name || round_name || `Round ${data.round_number}`}</span>
          {hasGameConflict && typeof nodeData?.onMergeWarningClick === 'function' && (
            <button
              type="button"
              className="ml-2 inline-flex items-center justify-center text-yellow-600 font-bold"
              title="Resolve incoming stage conflict"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof nodeData?.onMergeWarningClick === 'function') {
                  nodeData.onMergeWarningClick(nodeData.round_id);
                }
              }}
            >
              !
            </button>
          )}
          {allows_reentry && (
            <div 
              title="Re-entries allowed"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md ml-2"
            >
              <PersonAddIcon 
                className="w-4 h-4" 
              />
            </div>
          )}
        </div>

        {/* Participant info */}
        <div className="text-sm space-y-2">
          <div className="capitalize">
            <span className="font-medium">Round type:</span> {competitionMethodLabel}
          </div>
          {!nodeData?.hideParticipantCount && (
            <div>
              <span className="font-medium">Participants:</span> {participant_count}
            </div>
          )}
          {advancement_count > 0 && !is_final && (
            <div>
              <span className="font-medium">Advancing:</span> {advancement_count}
            </div>
          )}
          <div className="capitalize">
            <span className="font-medium">Status:</span> {status}
          </div>
        </div>
      </div>

      {/* Output handles - multiple positions for different relationships */}
      {!is_final && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="source-top"
            isConnectable={isConnectable}
            className="w-4 h-4 border-2 border-white"
            style={{ top: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="source-center"
            isConnectable={isConnectable}
            className="w-4 h-4 border-2 border-white"
            style={{ top: '50%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="source-bottom"
            isConnectable={isConnectable}
            className="w-4 h-4 border-2 border-white"
            style={{ top: '70%' }}
          />
        </>
      )}
    </div>
  );
};

export default TournamentRoundNode; 