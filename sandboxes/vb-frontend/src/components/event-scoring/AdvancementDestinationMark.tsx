import React from 'react';
import type { AdvancementDestination } from '../../utils/advancementDestinations';
import CheckIcon from '@mui/icons-material/Check';

export interface AdvancementDestinationMarkProps {
  destinations: AdvancementDestination[];
  className?: string;
}

function buildTooltip(destinations: AdvancementDestination[]): string {
  if (!destinations.length) return '';
  const roundDests = destinations.filter((d) => d.kind === 'round');
  const finalDests = destinations.filter((d) => d.kind === 'final_node');

  const lines: string[] = [];
  if (roundDests.length) {
    lines.push(
      `Advancing to: ${roundDests.map((d) => d.label).join('; ')}`
    );
  }
  if (finalDests.length) {
    lines.push(
      `Final: ${finalDests.map((d) => d.label).join('; ')}`
    );
  }
  return lines.join('\n');
}

const AdvancementDestinationMark: React.FC<AdvancementDestinationMarkProps> = ({
  destinations,
  className = '',
}) => {
  if (!destinations.length) return null;

  const hasRound = destinations.some((d) => d.kind === 'round');
  const isFinalOnly = !hasRound;

  const colorClass = isFinalOnly ? 'text-warning' : 'text-success';
  const title = buildTooltip(destinations);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ml-2 rounded-full bg-current/15 p-0.5 drop-shadow-sm ${colorClass} ${className}`}
      title={title}
      aria-label={title}
    >
      <CheckIcon className="h-5 w-5 stroke-[3]" aria-hidden />
    </span>
  );
};

export default AdvancementDestinationMark;
