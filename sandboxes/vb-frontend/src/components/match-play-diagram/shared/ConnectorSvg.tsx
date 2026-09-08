import React from 'react';
import type { LineSegment } from './layoutUtils';
import { CONNECTOR_WIDTH } from './constants';

export interface ConnectorSvgProps {
  lines: LineSegment[];
  height: number;
}

const ConnectorSvg: React.FC<ConnectorSvgProps> = ({ lines, height }) => (
  <svg className="shrink-0 text-border/90" width={CONNECTOR_WIDTH} height={height} aria-hidden>
    {lines.map((line, index) => (
      <line
        key={index}
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    ))}
  </svg>
);

export default ConnectorSvg;
