import React, { useMemo } from 'react';
import MatchBlock, { type MatchBlockProps } from './MatchBlock';
import ConnectorSvg from './ConnectorSvg';
import {
  COLUMN_HEADER_HEIGHT,
  COLUMN_WIDTH,
  DIAGRAM_MIN_WIDTH,
  MATCH_BLOCK_HEIGHT,
  MATCH_GAP,
} from './constants';
import {
  bracketCanvasHeight,
  buildConnectorLinesFromTops,
  computeBracketPositions,
  computeFinalTop,
  computeNextRoundTops,
  matchTop,
} from './layoutUtils';

export interface DiagramShellColumn {
  key: string;
  header: string;
  matches: Array<Omit<MatchBlockProps, never> & { key: string }>;
}

export interface MatchDiagramShellProps {
  columns: DiagramShellColumn[];
  title?: string;
  subtitle?: string;
  statusPill?: string;
  footer?: React.ReactNode;
  minWidth?: number;
}

const MatchDiagramShell: React.FC<MatchDiagramShellProps> = ({
  columns,
  title,
  subtitle,
  statusPill,
  footer,
  minWidth = DIAGRAM_MIN_WIDTH,
}) => {
  const firstRoundCount = columns[0]?.matches.length ?? 1;
  const totalHeight = bracketCanvasHeight(firstRoundCount);

  const positionedColumns = useMemo(() => {
    let prevTops: number[] = [];
    return columns.map((col, colIndex) => {
      if (colIndex === 0) {
        const positions = col.matches.map((_, index) => matchTop(index));
        prevTops = positions;
        return { ...col, positions };
      }
      const halved = computeNextRoundTops(prevTops);
      const positions =
        halved.length === col.matches.length
          ? halved
          : computeBracketPositions(col.matches.length);
      prevTops = positions;
      return { ...col, positions };
    });
  }, [columns]);

  return (
    <div className="space-y-4">
      {(title || statusPill) && (
        <div className="flex flex-wrap items-center gap-3">
          {title && (
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary">{title}</h3>
          )}
          {statusPill && (
            <span className="rounded-full border border-border bg-surface-light px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              {statusPill}
            </span>
          )}
        </div>
      )}
      {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}

      <div className="overflow-x-auto px-1 pb-2">
        <div className="inline-flex items-start" style={{ minWidth }}>
          {positionedColumns.map((col, colIndex) => {
            const prevCol = positionedColumns[colIndex - 1];
            const connectorLines =
              colIndex > 0 && prevCol
                ? buildConnectorLinesFromTops(prevCol.positions, col.positions)
                : [];

            return (
              <React.Fragment key={col.key}>
                {colIndex > 0 && <ConnectorSvg lines={connectorLines} height={totalHeight} />}
                <div
                  className="relative shrink-0"
                  style={{ width: COLUMN_WIDTH, height: totalHeight }}
                >
                  <p
                    className="absolute left-0 right-0 text-xs font-bold uppercase tracking-[0.12em] text-primary"
                    style={{ height: COLUMN_HEADER_HEIGHT }}
                  >
                    {col.header}
                  </p>
                  {col.matches.map((match, index) => {
                    const { key, ...blockProps } = match;
                    return (
                      <div
                        key={key}
                        className="absolute left-0 right-0"
                        style={{
                          top: col.positions[index] ?? 0,
                          height: MATCH_BLOCK_HEIGHT,
                        }}
                      >
                        <MatchBlock {...blockProps} height={MATCH_BLOCK_HEIGHT} />
                      </div>
                    );
                  })}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {footer}
    </div>
  );
};

export { MATCH_BLOCK_HEIGHT, MATCH_GAP, COLUMN_HEADER_HEIGHT, computeFinalTop };

export default MatchDiagramShell;
