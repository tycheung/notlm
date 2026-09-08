import React from 'react';
import PageTitle from '../../../components/common/PageTitle';
import Breadcrumb from '../../../components/common/Breadcrumb';

const MobileDeleteAccount: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Breadcrumb 
          items={[
            { label: 'Home', path: '/' },
            { label: 'Tutorial', path: '/tutorial' },
            { label: 'Mobile', path: '/tutorial/mobile' },
            { label: 'Delete Account & Data' }
          ]} 
        />
        
        <div className="bg-surface rounded-lg shadow-xl p-6 sm:p-8 md:p-10">
          <PageTitle size="hero" className="mb-2">Victory Bowling — Delete Account & Data</PageTitle>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">How to Delete Your Account and Data</h2>
              <p className="text-text-muted mb-4">
                Victory Bowling stores all bowling data locally on your device. If you use the optional Google Cloud Sync feature, a backup copy is also stored in your Google Drive app data folder.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">Delete Cloud Sync Account Connection</h2>
              <ol className="list-decimal pl-6 text-text-muted mb-4 space-y-2">
                <li>Open Victory Bowling</li>
                <li>Go to <strong>Settings → Backup & Restore</strong></li>
                <li>Tap <strong>Sign Out</strong> under Cloud Sync</li>
                <li>This disconnects your Google account and removes your stored credentials from the app</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">Delete Cloud Backup Data</h2>
              <p className="text-text-muted mb-4">
                When you sign out of Cloud Sync, Victory Bowling's backup file remains in your Google Drive app data folder. To remove it:
              </p>
              <ol className="list-decimal pl-6 text-text-muted mb-4 space-y-2">
                <li>Go to <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-light underline">https://myaccount.google.com/permissions</a></li>
                <li>Find <strong>Victory Bowling</strong> in the list of third-party apps</li>
                <li>Click <strong>Remove Access</strong></li>
                <li>This revokes the app's access and deletes the app-specific data stored in your Google Drive</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">Delete All Local Data</h2>
              <p className="text-text-muted mb-4">
                All bowling scores, sessions, statistics, and settings are stored locally on your device. To delete everything:
              </p>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">Option A — Clear App Data:</h3>
              <ol className="list-decimal pl-6 text-text-muted mb-4 space-y-2">
                <li>Open your device's <strong>Settings → Apps → Victory Bowling</strong></li>
                <li>Tap <strong>Storage → Clear Data</strong></li>
                <li>This removes all local bowling data, preferences, and cached information</li>
              </ol>

              <h3 className="text-xl font-semibold text-text-muted mb-3">Option B — Uninstall:</h3>
              <ol className="list-decimal pl-6 text-text-muted mb-4 space-y-2">
                <li>Uninstall Victory Bowling from your device</li>
                <li>All local data is permanently removed upon uninstallation</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">What Data Is Deleted</h2>
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-surface-light">
                      <th className="border border-border px-4 py-3 text-left font-semibold text-text">Data Type</th>
                      <th className="border border-border px-4 py-3 text-left font-semibold text-text">Where Stored</th>
                      <th className="border border-border px-4 py-3 text-left font-semibold text-text">How to Delete</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-muted">
                    <tr>
                      <td className="border border-border px-4 py-3">Bowling scores, sessions, frames</td>
                      <td className="border border-border px-4 py-3">On your device</td>
                      <td className="border border-border px-4 py-3">Clear app data or uninstall</td>
                    </tr>
                    <tr className="bg-surface-light">
                      <td className="border border-border px-4 py-3">Bowling centers, balls, leagues</td>
                      <td className="border border-border px-4 py-3">On your device</td>
                      <td className="border border-border px-4 py-3">Clear app data or uninstall</td>
                    </tr>
                    <tr>
                      <td className="border border-border px-4 py-3">App settings and preferences</td>
                      <td className="border border-border px-4 py-3">On your device</td>
                      <td className="border border-border px-4 py-3">Clear app data or uninstall</td>
                    </tr>
                    <tr className="bg-surface-light">
                      <td className="border border-border px-4 py-3">Google account email and name</td>
                      <td className="border border-border px-4 py-3">On your device</td>
                      <td className="border border-border px-4 py-3">Sign out in app</td>
                    </tr>
                    <tr>
                      <td className="border border-border px-4 py-3">Cloud backup file</td>
                      <td className="border border-border px-4 py-3">Google Drive (app data)</td>
                      <td className="border border-border px-4 py-3">Remove access at Google account permissions</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">What Data Is NOT Collected</h2>
              <p className="text-text-muted mb-4">
                Victory Bowling's mobile app does not send any data to Victory Bowling servers. There are no analytics, no tracking, and no advertising. All data remains on your device or in your personal Google Drive account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">Contact</h2>
              <p className="text-text-muted mb-4">
                If you need assistance deleting your data, contact us at <a href="mailto:support@victorybowling.com" className="text-primary hover:text-primary-light underline">support@victorybowling.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDeleteAccount;
