import React from 'react';

interface SaOnlyBadgeProps {
  className?: string;
}

const SaOnlyBadge: React.FC<SaOnlyBadgeProps> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-500/30 ${className}`}
  >
    SA
  </span>
);

export default SaOnlyBadge;
