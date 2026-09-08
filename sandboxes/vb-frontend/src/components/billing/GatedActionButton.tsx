import React from 'react';
import Button from '../common/Button';

/** Greyed create/edit control with hover reason (title tooltip). */
const GatedActionButton: React.FC<{
  allowed: boolean;
  blockedReason: string;
  onClick: () => void;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
  'data-guide-id'?: string;
}> = ({
  allowed,
  blockedReason,
  onClick,
  children,
  variant = 'darkbackground',
  className = '',
  'data-guide-id': dataGuideId,
}) => (
  <span title={allowed ? undefined : blockedReason} className="inline-flex">
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={!allowed}
      data-guide-id={dataGuideId}
      onClick={() => {
        if (!allowed) return;
        onClick();
      }}
    >
      {children}
    </Button>
  </span>
);

export default GatedActionButton;
