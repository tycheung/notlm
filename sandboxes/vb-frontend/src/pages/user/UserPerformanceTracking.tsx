import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../../components/common/Alert';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import BowlerHistoryView from './BowlerHistoryView';

const UserPerformanceTracking: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isFinancials = new URLSearchParams(location.search).get('tab') === 'financials';

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="warning" message="Please log in to view your stats." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          homeCrumb(),
          layoutDashboardCrumb(location.pathname),
          { label: isFinancials ? 'Financials' : 'Stats' },
        ]}
        className="mb-4"
      />
      <div className="mb-6">
        <PageTitle size="responsive" className="mb-2">
          {isFinancials ? 'Financials' : 'Stats'}
        </PageTitle>
        <p className="text-text-muted text-sm sm:text-base">
          {isFinancials
            ? 'Entry fees, prize funds, and side action money for events you entered'
            : 'Your averages and events you have bowled'}
        </p>
      </div>
      <BowlerHistoryView subjectUserId={user.id} showReport />
    </div>
  );
};

export default UserPerformanceTracking;
