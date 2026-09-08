import React from 'react';
import { getImpersonation, isImpersonating, stopImpersonation } from '../../utils/impersonationSession';

const ImpersonationBanner: React.FC = () => {
  if (!isImpersonating()) return null;
  const info = getImpersonation();
  if (!info) return null;

  return (
    <div className="bg-primary text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm z-50">
      <span>
        Viewing as <strong>{info.targetName}</strong> (TD) to troubleshoot. Return to admin when
        finished.
      </span>
      <button
        type="button"
        className="underline font-semibold shrink-0"
        onClick={() => stopImpersonation()}
      >
        Return to admin
      </button>
    </div>
  );
};

export default ImpersonationBanner;
