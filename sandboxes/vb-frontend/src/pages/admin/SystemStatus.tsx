import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { SystemAPI, SystemHealth } from '../../api/system';
import { AlertsAPI, SystemAlert } from '../../api/alerts';
import { formatDateTimeNaive } from '../../utils/dateUtils';

const SystemStatus: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, alertsData] = await Promise.all([
        SystemAPI.getSystemHealth(),
        AlertsAPI.getAlerts({ limit: 20 }),
      ]);
      setHealth(healthData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Failed to load system status details', err);
      setError('Failed to load system status details. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const dismissAlert = async (id: number) => {
    try {
      await AlertsAPI.dismissAlert(id);
      await loadStatus();
    } catch (err) {
      console.error('Failed to dismiss alert', err);
      setError('Failed to dismiss alert.');
    }
  };

  const criticalAlerts = alerts.filter(a => a.type === 'error');

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <Breadcrumb
          items={[homeCrumb(), layoutDashboardCrumb(location.pathname), { label: 'System status' }]}
          className="mb-4"
        />
        <div className="flex justify-between items-center mb-6">
          <PageTitle>System Status</PageTitle>
          <Button variant="lightbackground" onClick={loadStatus} disabled={loading}>
            Refresh
          </Button>
        </div>

        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}

        {loading ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="Health Summary" className="shadow-sm">
              <div className="p-5 space-y-4 text-sm">
                <p><span className="font-semibold">Status:</span> <span className="capitalize">{health?.status ?? 'unknown'}</span></p>
                <p><span className="font-semibold">Uptime:</span> {health ? `${(health.uptimeHours / 24).toFixed(1)} days` : 'N/A'}</p>
                <p><span className="font-semibold">Database Size:</span> {health ? `${health.dbSize.toFixed(1)} MB` : 'N/A'}</p>
                <p><span className="font-semibold">DB Connections:</span> {health?.dbConnections ?? 'N/A'}</p>
                <p><span className="font-semibold">Response Time:</span> {health ? `${health.dbResponseTime.toFixed(2)} ms` : 'N/A'}</p>
                <p><span className="font-semibold">Last Backup:</span> {health?.lastBackup ? formatDateTimeNaive(health.lastBackup) : 'Not available'}</p>
                {health && health.statusReasons.length > 0 && (
                  <p><span className="font-semibold">Reasons:</span> {health.statusReasons.join(', ')}</p>
                )}
                {health && (
                  <div className="pt-2 space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">Disk usage</span>
                        <span>{health.diskUsage}%</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            health.diskUsage > 80
                              ? 'bg-red-600'
                              : health.diskUsage > 60
                                ? 'bg-yellow-400'
                                : 'bg-green-600'
                          }`}
                          style={{ width: `${health.diskUsage}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">Memory usage</span>
                        <span>{health.memoryUsage}%</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            health.memoryUsage > 80
                              ? 'bg-red-600'
                              : health.memoryUsage > 60
                                ? 'bg-yellow-400'
                                : 'bg-green-600'
                          }`}
                          style={{ width: `${health.memoryUsage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card title={`Critical Alerts (${criticalAlerts.length})`} className="shadow-sm">
              <div className="p-5 space-y-3">
                {criticalAlerts.length === 0 ? (
                  <p className="text-sm text-text-muted">No active critical alerts.</p>
                ) : (
                  criticalAlerts.map(alert => (
                    <div key={alert.id} className="border border-border rounded-md p-3">
                      <p className="text-sm text-text">{alert.message}</p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-text-muted">{formatDateTimeNaive(alert.timestamp)}</span>
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStatus;
