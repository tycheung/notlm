import React from 'react';
import { Link } from 'react-router-dom';

import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';

const CookiePolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Breadcrumb 
          items={[
            { label: 'Home', path: '/' },
            { label: 'Cookie Policy' }
          ]} 
        />
        
          <div className="bg-surface border border-border rounded-lg shadow-xl p-6 sm:p-8 md:p-10 prose-legal">
            <PageTitle size="hero" className="mb-2">Cookie Policy</PageTitle>
            <p className="text-text-muted mb-8">Last updated: February 13, 2026</p>
          
          <div className="max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">1. What Are Cookies?</h2>
              <p className="text-text-muted mb-4">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
              </p>
              <p className="text-text-muted mb-4">
                Victory Bowling uses cookies and similar tracking technologies to enhance your experience on our Platform, analyze usage patterns, and provide personalized content and advertisements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">2. Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">2.1 Essential Cookies</h3>
              <p className="text-text-muted mb-4">
                These cookies are necessary for the Platform to function properly. They enable core functionality such as security, network management, and accessibility. You cannot opt out of these cookies as they are essential for the Platform to work.
              </p>
              <p className="text-text-muted mb-4">Examples include:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Authentication cookies that keep you logged in</li>
                <li>Session cookies that maintain your session state</li>
                <li>Security cookies that protect against fraud</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-muted mb-3">2.2 Performance Cookies</h3>
              <p className="text-text-muted mb-4">
                These cookies help us understand how visitors interact with the Platform by collecting and reporting information anonymously. This helps us improve the Platform's performance and user experience.
              </p>
              <p className="text-text-muted mb-4">Examples include:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Analytics cookies that track page views and user interactions</li>
                <li>Performance monitoring cookies that identify technical issues</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-muted mb-3">2.3 Functionality Cookies</h3>
              <p className="text-text-muted mb-4">
                These cookies allow the Platform to remember choices you make (such as language preferences, region, or login information) and provide enhanced, personalized features.
              </p>
              <p className="text-text-muted mb-4">Examples include:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Preference cookies that remember your settings</li>
                <li>Localization cookies that remember your language and region</li>
                <li>User interface customization cookies</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-muted mb-3">2.4 Targeting/Advertising Cookies</h3>
              <p className="text-text-muted mb-4">
                These cookies are used to deliver advertisements that are relevant to you and your interests. They may also be used to limit the number of times you see an advertisement and measure the effectiveness of advertising campaigns.
              </p>
              <p className="text-text-muted mb-4">Examples include:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Advertising network cookies</li>
                <li>Social media cookies for sharing content</li>
                <li>Retargeting cookies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">3. How We Use Cookies</h2>
              <p className="text-text-muted mb-4">We use cookies for the following purposes:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li><strong>Authentication:</strong> To keep you logged in and maintain your session</li>
                <li><strong>Security:</strong> To detect and prevent fraud and unauthorized access</li>
                <li><strong>Preferences:</strong> To remember your settings and preferences</li>
                <li><strong>Analytics:</strong> To understand how you use the Platform and improve our services</li>
                <li><strong>Performance:</strong> To monitor and improve Platform performance</li>
                <li><strong>Personalization:</strong> To provide personalized content and recommendations</li>
                <li><strong>Advertising:</strong> To deliver relevant advertisements (with your consent)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">4. Third-Party Cookies</h2>
              <p className="text-text-muted mb-4">
                In addition to our own cookies, we may also use various third-party cookies to report usage statistics, deliver advertisements, and provide other services. These third parties may include:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li><strong>Analytics Providers:</strong> Such as Google Analytics, to help us analyze Platform usage</li>
                <li><strong>Payment Processors:</strong> To process payments securely</li>
                <li><strong>Advertising Networks:</strong> To deliver relevant advertisements</li>
                <li><strong>Social Media Platforms:</strong> To enable social sharing features</li>
              </ul>
              <p className="text-text-muted mb-4">
                These third parties may use cookies and similar technologies to collect information about your online activities across different websites. We do not control these third-party cookies, and their use is governed by their respective privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">5. Cookie Duration</h2>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">5.1 Session Cookies</h3>
              <p className="text-text-muted mb-4">
                Session cookies are temporary and are deleted when you close your browser. They are used to maintain your session while you navigate the Platform.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">5.2 Persistent Cookies</h3>
              <p className="text-text-muted mb-4">
                Persistent cookies remain on your device for a set period or until you delete them. They are used to remember your preferences and improve your experience across sessions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">6. Managing Cookies</h2>
              <p className="text-text-muted mb-4">
                You have the right to accept or reject cookies. Most web browsers automatically accept cookies, but you can usually modify your browser settings to decline cookies if you prefer.
              </p>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">6.1 Browser Settings</h3>
              <p className="text-text-muted mb-4">
                You can control cookies through your browser settings. However, if you choose to disable cookies, some features of the Platform may not function properly. Instructions for managing cookies in popular browsers:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies and site permissions</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-muted mb-3">6.2 Platform Cookie Settings</h3>
              <p className="text-text-muted mb-4">
                You can manage your cookie preferences through your account settings on the Platform. You can choose to accept or reject non-essential cookies, including analytics and advertising cookies.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">6.3 Opt-Out Tools</h3>
              <p className="text-text-muted mb-4">
                You can opt out of certain third-party advertising cookies by visiting:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Network Advertising Initiative: <a href="http://www.networkadvertising.org/choices/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-light underline">www.networkadvertising.org/choices/</a></li>
                <li>Digital Advertising Alliance: <a href="http://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-light underline">www.aboutads.info/choices/</a></li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">7. Do Not Track Signals</h2>
              <p className="text-text-muted mb-4">
                Some browsers include a "Do Not Track" (DNT) feature that signals to websites you visit that you do not want to have your online activity tracked. Currently, there is no standard for how DNT signals should be interpreted. As a result, we do not currently respond to DNT signals.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">8. Mobile Applications</h2>
              <p className="text-text-muted mb-4">
                If you use our mobile application, we may use similar technologies such as mobile device identifiers and SDKs to collect information about your device and usage. You can manage these through your device settings or the application settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">9. Updates to This Cookie Policy</h2>
              <p className="text-text-muted mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new Cookie Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">10. More Information</h2>
              <p className="text-text-muted mb-4">
                For more information about how we handle your personal information, please see our <Link to="/privacy" className="text-primary hover:text-primary-light underline">Privacy Policy</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">11. Contact Us</h2>
              <p className="text-text-muted mb-4">
                If you have any questions about this Cookie Policy, please contact us at <a href="mailto:support@victorybowling.com" className="text-primary hover:text-primary-light underline">support@victorybowling.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
