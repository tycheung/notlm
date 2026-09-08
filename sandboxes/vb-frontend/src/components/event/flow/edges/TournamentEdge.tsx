import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { AdvancementFilter } from '../../../../types/roundRelationship';
import { FLOW_COLORS } from '../../../../theme/flowColors';

const TournamentEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}) => {
  const edgeData = data as any;
  const advancementFilter = edgeData?.advancement_filter || AdvancementFilter.WINNERS;
  const isFinalNodeEdge = Boolean(edgeData?.final_node_id && !edgeData?.target_round_id);
  const participantCount = edgeData?.participant_count || 0;
  const isPodsSource = String(edgeData?.source_competition_method ?? '') === 'pods';

  // Get edge styling based on advancement filter
  const getEdgeStyle = (filter: AdvancementFilter) => {
    switch (filter) {
      case AdvancementFilter.WINNERS:
      case AdvancementFilter.TOP_N:
        return {
          stroke: FLOW_COLORS.winners,
          strokeWidth: selected ? 3 : 2,
          markerEnd: 'url(#winners-arrow)'
        };
      case AdvancementFilter.LOSERS:
      case AdvancementFilter.BOTTOM_N:
        return {
          stroke: FLOW_COLORS.losers, 
          strokeWidth: selected ? 3 : 2,
          markerEnd: 'url(#losers-arrow)'
        };
      case AdvancementFilter.ALL:
      case AdvancementFilter.RANGE:
        return {
          stroke: FLOW_COLORS.all,
          strokeWidth: selected ? 3 : 2,
          markerEnd: 'url(#all-arrow)'
        };
      default:
        return {
          stroke: FLOW_COLORS.default,
          strokeWidth: selected ? 3 : 2,
          markerEnd: 'url(#default-arrow)'
        };
    }
  };

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = getEdgeStyle(advancementFilter);
  if (isFinalNodeEdge) {
    edgeStyle.stroke = FLOW_COLORS.champions;
    edgeStyle.markerEnd = 'url(#champions-arrow)';
  }

  // Get label text
  const getLabelText = () => {
    if (isPodsSource) return 'Per pod';
    switch (advancementFilter) {
      case AdvancementFilter.TOP_N_PER_SQUAD:
        return 'Per squad';
      case AdvancementFilter.TOP_N_PER_SQUAD_AT_LARGE:
        return 'Squad + at-large';
      case AdvancementFilter.TOP_N:
        return 'Top N';
      case AdvancementFilter.BOTTOM_N:
        return 'Bottom N';
      case AdvancementFilter.ALL:
        return 'All';
      case AdvancementFilter.RANGE:
        return 'Range';
      default:
        return isFinalNodeEdge
          ? 'Final Node'
          : advancementFilter.charAt(0).toUpperCase() + advancementFilter.slice(1);
    }
  };

  // Get label styling
  const getLabelStyle = () => {
    switch (advancementFilter) {
      case AdvancementFilter.WINNERS:
      case AdvancementFilter.TOP_N:
        return 'bg-success text-white border-success';
      case AdvancementFilter.LOSERS:
      case AdvancementFilter.BOTTOM_N:
        return 'bg-danger text-white border-danger';
      case AdvancementFilter.ALL:
      case AdvancementFilter.RANGE:
        return 'bg-accent text-white border-accent';
      default:
        return isFinalNodeEdge
          ? 'bg-pending text-text border-pending'
          : 'bg-surface text-text border-border';
    }
  };

  return (
    <>
      {/* Edge path */}
      <path
        id={id}
        style={edgeStyle}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
      />
      
      {/* Edge label — HTML layer above SVG edges/arrows (z-axis stacking) */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            zIndex: selected ? 1001 : 1000,
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
          className="nodrag nopan"
          onDoubleClick={(e) => {
            e.stopPropagation();
            // Trigger the same double-click behavior as the edge
            const relationshipId = edgeData?.relationship_id;
            if (relationshipId) {
              // Dispatch a custom event that bubbles up to the document
              const customEvent = new CustomEvent('edgeLabelDoubleClick', {
                detail: { relationshipId, edgeData },
                bubbles: true,
                cancelable: true
              });
              document.dispatchEvent(customEvent);
            }
          }}
        >
          <div 
            className={`
              px-4 py-2 rounded-md text-sm font-semibold border min-w-[7rem] text-center
              ${getLabelStyle()}
              ${selected ? 'ring-2 ring-accent' : ''}
              shadow-sm
              hover:shadow-md transition-shadow duration-200
            `}
            title="Double-click to configure advancement rules"
          >
            {getLabelText()}
            {participantCount > 0 && (
              <span className="ml-1 opacity-75">({participantCount})</span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default TournamentEdge; 