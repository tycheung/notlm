import React from 'react';
import { Link } from 'react-router-dom';
import Alert from '../common/Alert';

/** Shown when alumni keep Director View but cannot create/modify. */
const DirectorReadOnlyBanner: React.FC<{ className?: string }> = ({
  className = 'mb-4',
}) => (
  <Alert
    variant="info"
    className={className}
    message={
      <span>
        Read-only Director View — you can review history and Actions Needed, but creating
        or modifying tournaments and events requires an active subscription or pass.{' '}
        <Link to="/director/subscription" className="underline font-medium">
          Manage Subscription
        </Link>
      </span>
    }
  />
);

export default DirectorReadOnlyBanner;
