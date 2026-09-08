import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  ReactFlowInstance,
  OnMove,
  Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom components
import TournamentRoundNode from './nodes/TournamentRoundNode';
import ChampionsNode from './nodes/ChampionsNode';
import TournamentEdge from './edges/TournamentEdge';

// Utils
import { createTournamentFlow } from './utils/layoutUtils';
import { FLOW_COLORS } from '../../../theme/flowColors';

// Types
import { RoundRead } from '../../../types/round';
import { RoundRelationshipRead } from '../../../types/roundRelationship';
import { FinalNodeRead } from '../../../types/event';

interface TournamentFlowDiagramProps {
  rounds: RoundRead[];
  relationships: RoundRelationshipRead[];
  finalNodes?: FinalNodeRead[];
  onRoundClick?: (roundId: number) => void;
  onChampionsNodeClick?: (finalNodeId: number) => void;
  /** Full diagram: double-click champions/exit node to edit (e.g. FinalNodeModal). */
  onFinalNodeDoubleClick?: (finalNodeId: number) => void;
  onChampionshipEdgeClick?: (relationshipId: number) => void;
  onRelationshipClick?: (relationshipId: number) => void;
  onMergeWarningClick?: (roundId: number) => void;
  className?: string;
  /** Compact read-only preview: fixed height, no extra chrome below diagram, nodes not draggable */
  compact?: boolean;
  /** When true, round nodes omit the participant count line (e.g. format wizard has no live roster). */
  hideParticipantCount?: boolean;
}

// Define custom node types
const nodeTypes: NodeTypes = {
  'tournament-round': TournamentRoundNode,
  'champions': ChampionsNode,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  'tournament-edge': TournamentEdge,
};

const TournamentFlowDiagram: React.FC<TournamentFlowDiagramProps> = ({
  rounds,
  relationships,
  finalNodes = [],
  onRoundClick,
  onChampionsNodeClick,
  onFinalNodeDoubleClick,
  onChampionshipEdgeClick,
  onRelationshipClick,
  onMergeWarningClick,
  className = '',
  compact = false,
  hideParticipantCount = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as any);
  const [graphBounds, setGraphBounds] = useState({ width: 800, height: 600 });
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [interactionTimeout, setInteractionTimeout] = useState<number | null>(null);

  // Calculate dynamic height based on content
  const getDynamicHeight = () => {
    if (compact) {
      return 320;
    }
    // Minimum height
    const minHeight = 400;
    // Maximum height to prevent overly tall diagrams
    const maxHeight = 1000;
    // Base height on graph bounds with some padding
    const calculatedHeight = Math.min(maxHeight, Math.max(minHeight, graphBounds.height + 200));
    return calculatedHeight;
  };

  // Show minimap during interactions
  const showMiniMapTemporarily = useCallback(() => {
    setShowMiniMap(true);
    
    // Clear existing timeout
    if (interactionTimeout) {
      clearTimeout(interactionTimeout);
    }
    
    // Hide minimap after 2 seconds of no interaction
    const timeout = setTimeout(() => {
      setShowMiniMap(false);
    }, 2000);
    
    setInteractionTimeout(timeout);
  }, [interactionTimeout]);

  // Update nodes and edges when data changes
  useEffect(() => {
    if (rounds.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges, bounds } = createTournamentFlow(rounds, relationships, finalNodes);
      const nodesWithActions = layoutedNodes.map((node) => {
        if (node.type !== 'tournament-round') {
          return node;
        }
        return {
          ...node,
          data: {
            ...node.data,
            onMergeWarningClick,
            ...(hideParticipantCount ? { hideParticipantCount: true } : {}),
          },
        };
      });
      setNodes(nodesWithActions);
      setEdges(layoutedEdges);
      setGraphBounds(bounds);
    }
  }, [rounds, relationships, finalNodes, onMergeWarningClick, hideParticipantCount, setNodes, setEdges]);

  // Fit view when bounds change
  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      // Use setTimeout to ensure nodes are rendered before fitting
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.1, // 10% padding
          includeHiddenNodes: true,
          minZoom: 0.1,
          maxZoom: 1.5,
        });
      }, 100);
    }
  }, [reactFlowInstance, nodes, graphBounds]);

  // Handle ReactFlow initialization
  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      if (compact && node.type === 'tournament-round' && onRoundClick) {
        const roundId = node.data.round_id as number;
        // Defer so pointer events from React Flow finish before the modal mounts (avoids instant outside-close).
        queueMicrotask(() => onRoundClick(roundId));
      }
      if (compact && node.type === 'champions' && onChampionsNodeClick) {
        const finalNodeId = Number(node.data?.final_node_id);
        // Same defer behavior used for round modal open in compact preview.
        queueMicrotask(() => onChampionsNodeClick(finalNodeId));
      }
    },
    [compact, onRoundClick, onChampionsNodeClick]
  );

  // Handle edge single-clicks (temporary for testing)
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: any) => {
  }, []);

  // Handle node double-clicks (changed from single click)
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      if (node.type === 'tournament-round' && onRoundClick) {
        const roundId = node.data.round_id as number;
        queueMicrotask(() => onRoundClick(roundId));
        return;
      }
      if (node.type === 'champions' && onFinalNodeDoubleClick) {
        const finalNodeId = Number(node.data?.final_node_id);
        if (!Number.isNaN(finalNodeId) && finalNodeId !== 0) {
          queueMicrotask(() => onFinalNodeDoubleClick(finalNodeId));
        }
      }
    },
    [onRoundClick, onFinalNodeDoubleClick]
  );

  // Handle edge double-clicks (changed from single click)
  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: any) => {
    const relationshipId = edge.data?.relationship_id;
    if (!relationshipId) {
      return;
    }

    // Handle championship edges
    if (!edge.data?.target_round_id && edge.data?.final_node_id && onChampionshipEdgeClick) {
      onChampionshipEdgeClick(relationshipId);
    }
    // Handle regular relationship edges
    else if (onRelationshipClick) {
      onRelationshipClick(relationshipId);
    }
  }, [onChampionshipEdgeClick, onRelationshipClick]);

  // Handle edge label double-clicks
  const handleEdgeLabelDoubleClick = useCallback((event: CustomEvent) => {
    const { relationshipId, edgeData } = event.detail;
    
    if (!relationshipId) {
      return;
    }

    // Handle championship edges
    if (!edgeData?.target_round_id && edgeData?.final_node_id && onChampionshipEdgeClick) {
      onChampionshipEdgeClick(relationshipId);
    }
    // Handle regular relationship edges
    else if (onRelationshipClick) {
      onRelationshipClick(relationshipId);
    }
  }, [onChampionshipEdgeClick, onRelationshipClick]);

  // Add event listener for edge label double-clicks
  useEffect(() => {
    const handleEdgeLabelDoubleClickEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.type === 'edgeLabelDoubleClick') {
        handleEdgeLabelDoubleClick(customEvent);
      }
    };

    // Add event listener to the document to catch custom events from edge labels
    document.addEventListener('edgeLabelDoubleClick', handleEdgeLabelDoubleClickEvent);

    return () => {
      document.removeEventListener('edgeLabelDoubleClick', handleEdgeLabelDoubleClickEvent);
    };
  }, [handleEdgeLabelDoubleClick]);

  // Handle connection creation (if needed for future features)
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle pane interactions (clicking and dragging on empty space)
  const onPaneClick = useCallback(() => {
    showMiniMapTemporarily();
  }, [showMiniMapTemporarily]);

  // Handle viewport changes (zooming and panning)
  const onMove: OnMove = useCallback((event, viewport) => {
    showMiniMapTemporarily();
  }, [showMiniMapTemporarily]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }
    };
  }, [interactionTimeout]);

  if (rounds.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-surface rounded-lg border border-border ${compact ? 'h-48 m-0' : 'h-96 m-4'} ${className}`}
      >
        <div className="text-center px-4">
          <h3 className="text-lg font-medium text-text mb-2">No Advancement Format</h3>
          <p className="text-text-muted text-sm">Add stages to see the advancement structure</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'space-y-0 p-0' : 'space-y-6 p-4'} ${className}`}>
      {/* ReactFlow Container */}
      <div 
        className="w-full border border-border rounded-lg shadow-sm"
        style={{ height: `${getDynamicHeight()}px` }}
      >
        {/* SVG marker definitions for edge arrows */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <marker
              id="winners-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0,0 0,6 6,3"
                fill={FLOW_COLORS.winners}
              />
            </marker>
            
            <marker
              id="losers-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0,0 0,6 6,3"
                fill={FLOW_COLORS.losers}
              />
            </marker>
            
            <marker
              id="champions-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="7"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0,0 0,8 8,4"
                fill={FLOW_COLORS.champions}
              />
            </marker>
            
            <marker
              id="all-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0,0 0,6 6,3"
                fill={FLOW_COLORS.all}
              />
            </marker>
            
            <marker
              id="default-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0,0 0,6 6,3"
                fill={FLOW_COLORS.default}
              />
            </marker>
          </defs>
        </svg>
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onPaneClick={onPaneClick}
          onMove={onMove}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodeClickDistance={5}
          paneClickDistance={5}
          fitView
          fitViewOptions={{
            padding: 0.1,
            includeHiddenNodes: true,
            minZoom: 0.1,
            maxZoom: 1.5,
          }}
          attributionPosition="top-right"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            animated: false,
          }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={!compact}
          nodesConnectable={false}
          elementsSelectable={!compact}
        >
          {/* Background pattern */}
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          
          {/* Minimap - only show during interactions */}
          {showMiniMap && (
            <MiniMap
              bgColor="#111827"
              maskColor="rgba(10, 14, 23, 0.55)"
              maskStrokeColor="#f97316"
              maskStrokeWidth={2}
              nodeColor={(node) => {
                if (node.type === 'champions') return FLOW_COLORS.minimapChampions;
                switch (node.data?.status) {
                  case 'completed': return FLOW_COLORS.minimapCompleted;
                  case 'in_progress': return FLOW_COLORS.minimapInProgress;
                  case 'scheduled': return FLOW_COLORS.minimapScheduled;
                  default: return FLOW_COLORS.minimapDefault;
                }
              }}
              nodeStrokeColor="#0a0e17"
              nodeStrokeWidth={3}
              zoomable
              pannable
              position="top-left"
              className="!rounded-lg !border !border-border !shadow-lg"
            />
          )}
          
          {/* Controls */}
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default TournamentFlowDiagram; 