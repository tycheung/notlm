import React from 'react';
import { Link } from 'react-router-dom';

import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';

const RefundPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Breadcrumb 
          items={[
            { label: 'Home', path: '/' },
            { label: 'Refund Policy' }
          ]} 
        />
        
          <div className="bg-surface border border-border rounded-lg shadow-xl p-6 sm:p-8 md:p-10 prose-legal">
            <PageTitle size="hero" className="mb-2">Refund Policy</PageTitle>
            <p className="text-text-muted mb-8">Last updated: February 13, 2026</p>
          
          <div className="max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">1. Overview</h2>
              <p className="text-text-muted mb-4">
                Victory Bowling provides a platform for bowling tournament registration and management. This Refund Policy outlines the circumstances under which refunds may be issued for fees paid through our Platform.
              </p>
              <p className="text-text-muted mb-4">
                Please read this policy carefully before registering for a tournament. By completing a registration, you acknowledge that you have read, understood, and agree to this Refund Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">2. General Refund Policy</h2>
              <p className="text-text-muted mb-4">
                <strong>All tournament registration fees and entry fees are generally non-refundable.</strong> However, refunds may be issued in specific circumstances as outlined below. Refund eligibility is determined on a case-by-case basis and is subject to the discretion of Victory Bowling and the individual tournament director.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">3. Refund Eligibility</h2>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">3.1 Tournament Cancellation</h3>
              <p className="text-text-muted mb-4">
                If a tournament is cancelled by the tournament director or Victory Bowling, registered participants will receive a full refund of their registration fees. Refunds will be processed within 14 business days of the cancellation notice.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">3.2 Tournament Postponement</h3>
              <p className="text-text-muted mb-4">
                If a tournament is postponed and you are unable to attend the rescheduled date, you may be eligible for a refund. Refund requests must be submitted within 7 days of the postponement announcement. Refunds are subject to approval by the tournament director.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">3.3 Medical Emergencies</h3>
              <p className="text-text-muted mb-4">
                Refunds may be considered for documented medical emergencies that prevent participation. Requests must be submitted with appropriate medical documentation and are subject to review. Refund requests must be made before the tournament start date.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">3.4 Withdrawal Before Event Start</h3>
              <p className="text-text-muted mb-4">
                If you withdraw from a tournament before the event begins, you may be eligible for a partial or full refund, depending on the tournament&apos;s specific refund policy and what the tournament director has communicated about sign-ups and payment. Some tournaments may charge a withdrawal fee.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">3.5 Platform Errors</h3>
              <p className="text-text-muted mb-4">
                If you are charged incorrectly due to a technical error on our Platform, we will issue a full refund of the incorrect charge. Please contact us immediately if you believe you have been charged incorrectly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">4. Non-Refundable Fees</h2>
              <p className="text-text-muted mb-4">The following fees are generally non-refundable:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Processing fees charged by payment processors</li>
                <li>Platform service fees (if applicable)</li>
                <li>Fees for side actions, brackets, or other optional tournament features</li>
                <li>Fees for tournaments that have already started</li>
                <li>Fees for "no-show" participants who fail to attend without prior notice</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">4a. Tournament Director Access (Annual / Monthly / Credits)</h2>
              <p className="text-text-muted mb-4">
                <strong>Unused tournament credits</strong> purchased through the Platform may be refunded
                automatically when still unused. <strong>Annual and Monthly subscriptions</strong> are not
                refundable on a self-serve basis for prepaid time; you may cancel and retain access through
                the end of the prepaid term. Exceptional subscription refunds require support escalation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">5. Tournament-Specific Refund Policies</h2>
              <p className="text-text-muted mb-4">
                Individual tournament directors may establish their own refund policies that differ from this general policy. Tournament-specific refund policies will be clearly stated in the tournament description and registration page. In cases where a tournament has its own refund policy, that policy takes precedence over this general policy.
              </p>
              <p className="text-text-muted mb-4">
                <strong>It is your responsibility to review the refund policy for each tournament before registering.</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">6. How to Request a Refund</h2>
              <p className="text-text-muted mb-4">To request a refund, please follow these steps:</p>
              <ol className="list-decimal pl-6 text-text-muted mb-4 space-y-2">
                <li>Log into your Victory Bowling account</li>
                <li>Navigate to your tournament registrations</li>
                <li>Select the tournament for which you are requesting a refund</li>
                <li>Click "Request Refund" and provide the reason for your request</li>
                <li>Submit any required documentation (e.g., medical documentation)</li>
                <li>Wait for review and approval from the tournament director or Victory Bowling support team</li>
              </ol>
              <p className="text-text-muted mb-4">
                Alternatively, you can contact us directly through <a href="mailto:support@victorybowling.com" className="text-primary hover:text-primary-light underline">support@victorybowling.com</a> with your refund request.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">7. Refund Processing Time</h2>
              <p className="text-text-muted mb-4">
                Once a refund is approved, processing times vary depending on the payment method:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li><strong>Credit/Debit Cards:</strong> 5-10 business days</li>
                <li><strong>PayPal:</strong> 3-5 business days</li>
                <li><strong>Bank Transfers:</strong> 7-14 business days</li>
              </ul>
              <p className="text-text-muted mb-4">
                Refunds will be issued to the original payment method used for the transaction. If the original payment method is no longer available, please contact us to arrange an alternative refund method.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">8. Partial Refunds</h2>
              <p className="text-text-muted mb-4">
                In some cases, partial refunds may be issued. This may occur when:
              </p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>A tournament is partially completed before cancellation</li>
                <li>Withdrawal fees are applied</li>
                <li>Non-refundable fees are deducted from the total</li>
                <li>The tournament director's policy specifies partial refund amounts</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">9. Disputes and Appeals</h2>
              <p className="text-text-muted mb-4">
                If your refund request is denied and you believe the denial was incorrect, you may appeal the decision by contacting Victory Bowling support with additional information or documentation. We will review your appeal and make a final determination.
              </p>
              <p className="text-text-muted mb-4">
                Disputes between participants and tournament directors regarding refunds should first be addressed directly with the tournament director. Victory Bowling may assist in resolving disputes but is not obligated to do so.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">10. Chargebacks</h2>
              <p className="text-text-muted mb-4">
                If you initiate a chargeback with your bank or credit card company instead of following our refund process, Victory Bowling reserves the right to suspend or terminate your account. We encourage you to contact us first to resolve any issues before initiating a chargeback.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">11. Changes to This Policy</h2>
              <p className="text-text-muted mb-4">
                We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting on this page. Your continued use of the Platform after changes are posted constitutes acceptance of the modified policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">12. Contact Information</h2>
              <p className="text-text-muted mb-4">
                If you have questions about this Refund Policy or need to request a refund, please contact us at <a href="mailto:support@victorybowling.com" className="text-primary hover:text-primary-light underline">support@victorybowling.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
