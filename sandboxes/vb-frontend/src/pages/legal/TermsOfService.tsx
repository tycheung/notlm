import React from 'react';
import { Link } from 'react-router-dom';

import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Breadcrumb 
          items={[
            { label: 'Home', path: '/' },
            { label: 'Terms of Service' }
          ]} 
        />
        
          <div className="bg-surface border border-border rounded-lg shadow-xl p-6 sm:p-8 md:p-10 prose-legal">
            <PageTitle size="hero" className="mb-2">Terms of Service</PageTitle>
            <p className="text-text-muted mb-8">Last updated: February 13, 2026</p>
          
          <div className="max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">1. Acceptance of Terms</h2>
              <p className="text-text-muted mb-4">
                By accessing and using Victory Bowling ("the Platform", "we", "us", or "our"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">2. Description of Service</h2>
              <p className="text-text-muted mb-4">
                Victory Bowling is a platform that facilitates bowling tournament management, registration, and participation. We provide services including but not limited to:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Tournament creation and management tools for tournament directors (subscription required)</li>
                <li>Tournament registration and participation for bowlers (free)</li>
                <li>Score tracking and performance monitoring</li>
                <li>Event scheduling and squad management</li>
                <li>Prize distribution and payout management</li>
                <li>Communication tools between participants and organizers</li>
              </ul>
              <p className="text-text-muted mb-4">
                <strong>Free Services:</strong> Bowlers can create accounts, browse tournaments, register for tournaments, track their performance, and participate in tournaments at no cost.
              </p>
              <p className="text-text-muted mb-4">
                <strong>Subscription Services:</strong> Tournament directors must maintain an active subscription to access tournament management features, including creating tournaments, managing events, processing registrations, and accessing administrative tools.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">3. User Accounts</h2>
              <h3 className="text-xl font-semibold text-text-muted mb-3">3.1 Account Creation</h3>
              <p className="text-text-muted mb-4">
                To use certain features of the Platform, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
              </p>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">3.2 Account Security</h3>
              <p className="text-text-muted mb-4">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">3.3 Account Types</h3>
              <p className="text-text-muted mb-4">
                The Platform offers different account types including Bowler, Tournament Director, and Administrator accounts, each with different access levels and responsibilities as defined in these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">4. User Responsibilities</h2>
              <h3 className="text-xl font-semibold text-text-muted mb-3">4.1 Bowlers</h3>
              <p className="text-text-muted mb-4">
                As a bowler, you can use the Platform free of charge. You agree to:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Provide accurate personal and contact information</li>
                <li>Pay all tournament registration fees and entry fees set by tournament directors in a timely manner</li>
                <li>Comply with all tournament rules and regulations</li>
                <li>Conduct yourself in a respectful and sportsmanlike manner</li>
                <li>Report accurate scores and game results</li>
                <li>Maintain the security of your account credentials</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">4.2 Tournament Directors</h3>
              <p className="text-text-muted mb-4">
                As a tournament director, you must maintain an active subscription to access tournament management features. You agree to:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Maintain an active subscription for the duration of your tournament management activities</li>
                <li>Create accurate tournament and event information</li>
                <li>Manage tournaments fairly and in accordance with stated rules</li>
                <li>Process registrations and payments in a timely manner</li>
                <li>Distribute prizes and payouts as advertised</li>
                <li>Maintain appropriate insurance and comply with local regulations</li>
                <li>Respond to participant inquiries and resolve disputes fairly</li>
                <li>Ensure subscription payments are current to maintain access to management features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">5. Payments and Fees</h2>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">5.1 Free Services for Bowlers</h3>
              <p className="text-text-muted mb-4">
                Bowlers can use the Platform free of charge to browse tournaments, create accounts, register for tournaments, track performance, and participate in tournaments. No subscription or platform fees are required for bowler accounts.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">5.2 Subscription Fees for Tournament Directors</h3>
              <p className="text-text-muted mb-4">
                Tournament directors must maintain an active paid subscription to access tournament management features. Subscription fees are billed on a recurring basis (monthly or annually) and provide access to:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Tournament creation and management tools</li>
                <li>Event and round management features</li>
                <li>Participant registration management</li>
                <li>Score entry and management systems</li>
                <li>Administrative dashboards and reporting</li>
                <li>Customer support for tournament directors</li>
              </ul>
              <p className="text-text-muted mb-4">
                Subscription fees, pricing, and billing cycles are clearly disclosed before you subscribe.
                Tournament director plans include Annual, Monthly, and one-time tournament credits.
                You may cancel a subscription at any time through your account or billing portal; access
                continues through the end of the prepaid term. Unused tournament credits may be refunded
                when unused; see the{' '}
                <Link to="/refunds" className="text-primary hover:text-primary-light underline">
                  Refund Policy
                </Link>
                .
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">5.3 Tournament Registration Fees</h3>
              <p className="text-text-muted mb-4">
                Tournament directors may charge registration fees and entry fees for their tournaments. These fees are set by the tournament director and are separate from Platform subscription fees. Bowlers pay these fees directly to tournament directors or through the Platform's payment processing system.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">5.4 Payment Processing</h3>
              <p className="text-text-muted mb-4">
                Payment processing for subscriptions and tournament fees is handled by third-party payment processors. By making a payment, you agree to the terms and conditions of the applicable payment processor. We are not responsible for any issues arising from payment processing.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">5.5 Refunds</h3>
              <p className="text-text-muted mb-4">
                Subscription fees are generally non-refundable except as required by applicable law. Tournament registration fees are subject to the refund policy set by each tournament director and our general <Link to="/refunds" className="text-primary hover:text-primary-light underline">Refund Policy</Link>.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">5.6 Failed Payments</h3>
              <p className="text-text-muted mb-4">
                If a subscription payment fails, we will attempt to process the payment again. If payment continues to fail, we may suspend or terminate your tournament director account and access to subscription features until payment is successfully processed.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">6. Tournament Rules and Disputes</h2>
              <p className="text-text-muted mb-4">
                Each tournament may have its own specific rules and regulations. Participants are responsible for reviewing and understanding all tournament rules before registering. Tournament directors are responsible for enforcing their tournament rules fairly and consistently.
              </p>
              <p className="text-text-muted mb-4">
                Disputes between participants and tournament directors should first be addressed directly with the tournament director. Victory Bowling may, at its discretion, assist in dispute resolution but is not obligated to do so and is not responsible for the outcome of any disputes.
              </p>
              <p className="text-text-muted mb-4">
                Participants may report intentionally inaccurate or fraudulent scoring through the Platform. Victory Bowling reserves the right to investigate such reports and to suspend or cancel tournament director accounts, remove or correct recorded results, or take other remedial action when we determine that scores or tournament history have been fabricated or manipulated.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">7. Prohibited Conduct</h2>
              <p className="text-text-muted mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Use the Platform for any illegal purpose or in violation of any local, state, national, or international law</li>
                <li>Violate or infringe upon the rights of others, including intellectual property rights</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Interfere with or disrupt the Platform or servers</li>
                <li>Attempt to gain unauthorized access to any portion of the Platform</li>
                <li>Use automated systems to access the Platform without permission</li>
                <li>Impersonate any person or entity</li>
                <li>Manipulate scores or tournament results</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">8. Intellectual Property</h2>
              <p className="text-text-muted mb-4">
                The Platform and its original content, features, and functionality are owned by Victory Bowling and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-text-muted mb-4">
                You retain ownership of any content you post or submit to the Platform, but grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute such content for the purpose of operating and promoting the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">9. Privacy</h2>
              <p className="text-text-muted mb-4">
                Your use of the Platform is also governed by our <Link to="/privacy" className="text-primary hover:text-primary-light underline">Privacy Policy</Link>. Please review our Privacy Policy to understand how we collect, use, and protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">10. Disclaimers</h2>
              <p className="text-text-muted mb-4">
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="text-text-muted mb-4">
                We do not guarantee that the Platform will be uninterrupted, secure, or error-free. We are not responsible for the actions, content, or information of third parties, including tournament directors and other users.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">11. Limitation of Liability</h2>
              <p className="text-text-muted mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, VICTORY BOWLING SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE PLATFORM.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">12. Indemnification</h2>
              <p className="text-text-muted mb-4">
                You agree to indemnify and hold harmless Victory Bowling, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of or relating to your use of the Platform, violation of these Terms, or infringement of any rights of another.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">13. Termination</h2>
              <h3 className="text-xl font-semibold text-text-muted mb-3">13.1 Account Termination</h3>
              <p className="text-text-muted mb-4">
                We may terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Platform will cease immediately.
              </p>
              <p className="text-text-muted mb-4">
                You may terminate your account at any time by contacting us or using the account deletion features in your account settings.
              </p>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">13.2 Subscription Termination</h3>
              <p className="text-text-muted mb-4">
                Tournament directors may cancel their subscription at any time through their account settings. Cancellation will take effect at the end of the current billing period. Upon subscription cancellation or expiration, tournament directors will lose access to tournament management features but may continue to use the Platform as a bowler.
              </p>
              <p className="text-text-muted mb-4">
                If your subscription payment fails or your subscription expires, we may suspend your access to tournament management features until payment is successfully processed or a new subscription is activated.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">14. Changes to Terms</h2>
              <p className="text-text-muted mb-4">
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Platform after such modifications constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">15. Governing Law</h2>
              <p className="text-text-muted mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Victory Bowling operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">16. Contact Information</h2>
              <p className="text-text-muted mb-4">
                If you have any questions about these Terms of Service, please contact us at <a href="mailto:support@victorybowling.com" className="text-primary hover:text-primary-light underline">support@victorybowling.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
