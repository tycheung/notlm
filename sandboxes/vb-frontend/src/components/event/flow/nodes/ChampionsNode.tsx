import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ChampionsNodeData {
  final_node_name?: string;
  championship_count: number;
  description?: string;
}

const ChampionsNode: React.FC<NodeProps> = ({ 
  data, 
  isConnectable, 
  selected 
}) => {
  const d = data as ChampionsNodeData;
  const championship_count = d?.championship_count || 3;
  const title =
    (d?.final_node_name && String(d.final_node_name).trim()) || 'Exit node';
  const description = d?.description?.trim();

  return (
    <div 
      className={`
        champions-node px-8 py-6 rounded-xl border-4 border-yellow-400 
        bg-gradient-to-br from-yellow-100 to-yellow-200
        min-w-[320px] max-w-[360px]
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        shadow-lg hover:shadow-xl transition-all duration-200
        cursor-pointer
      `}
    >
      {/* Input handles - multiple positions for different relationships */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-top"
        isConnectable={isConnectable}
        className="w-5 h-5 border-2 border-yellow-600 bg-yellow-400"
        style={{ top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-center"
        isConnectable={isConnectable}
        className="w-5 h-5 border-2 border-yellow-600 bg-yellow-400"
        style={{ top: '50%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-bottom"
        isConnectable={isConnectable}
        className="w-5 h-5 border-2 border-yellow-600 bg-yellow-400"
        style={{ top: '70%' }}
      />

      {/* Champions content */}
      <div className="text-center">
        {/* Title — final node name from API */}
        <div className="font-bold text-xl text-yellow-800 mb-3 break-words px-1">
          {title}
        </div>

        {/* Championship positions */}
        <div className="text-base text-yellow-700 mb-2">
          <span className="font-medium">Positions:</span> {championship_count}
        </div>

        {/* Optional description (not the same as title) */}
        {description && description.toLowerCase() !== title.toLowerCase() && (
          <div className="text-sm text-yellow-600 mt-3 italic break-words px-1">
            {description}
          </div>
        )}

        {/* Championship positions breakdown */}
        <div className="text-sm text-yellow-600 mt-3 space-y-1">
          {championship_count >= 1 && <div>🥇 1st Place</div>}
          {championship_count >= 2 && <div>🥈 2nd Place</div>}
          {championship_count >= 3 && <div>🥉 3rd Place</div>}
          {championship_count > 3 && (
            <div>🏅 {championship_count - 3} more positions</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChampionsNode; 