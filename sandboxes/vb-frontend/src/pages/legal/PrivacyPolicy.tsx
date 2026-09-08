import React from 'react';
import { Link } from 'react-router-dom';

import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Breadcrumb 
          items={[
            { label: 'Home', path: '/' },
            { label: 'Privacy Policy' }
          ]} 
        />
        
          <div className="bg-surface border border-border rounded-lg shadow-xl p-6 sm:p-8 md:p-10 prose-legal">
            <PageTitle size="hero" className="mb-2">Privacy Policy</PageTitle>
            <p className="text-text-muted mb-8">Last updated: February 13, 2026</p>
          
          <div className="max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">1. Introduction</h2>
              <p className="text-text-muted mb-4">
                Victory Bowling ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our bowling tournament management platform (the "Platform"), which includes both our web application and mobile application.
              </p>
              <p className="text-text-muted mb-4">
                Please read this Privacy Policy carefully. By using the Platform, you consent to the data practices described in this policy. If you do not agree with the practices described in this policy, please do not use the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">2.1 Information You Provide</h3>
              <p className="text-text-muted mb-4">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number, date of birth, and password</li>
                <li><strong>Profile Information:</strong> Profile photo, bowling average, USBC number, and other profile details</li>
                <li><strong>Payment Information:</strong> Billing address, payment method details (processed securely through third-party processors)</li>
                <li><strong>Tournament Information:</strong> Registration details, scores, performance data, and participation history</li>
                <li><strong>Communication:</strong> Messages, feedback, and other communications you send to us or other users</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-muted mb-3">2.2 Information We Collect Automatically</h3>
              <p className="text-text-muted mb-4">When you use the Platform, we automatically collect certain information, including:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the Platform, and navigation patterns</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers, and mobile network information</li>
                <li><strong>Location Data:</strong> General location information based on IP address or GPS (with your permission)</li>
                <li><strong>Cookies and Tracking Technologies:</strong> See our <Link to="/cookies" className="text-primary hover:text-primary-light underline">Cookie Policy</Link> for more information</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-muted mb-3">2.3 Information from Third Parties</h3>
              <p className="text-text-muted mb-4">
                We may receive information about you from third parties, such as payment processors, social media platforms (if you connect your account), and tournament organizers who use our Platform.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">2.4 Mobile Application</h3>
              <p className="text-text-muted mb-4">
                <strong>Currently, our mobile application does not collect any data whatsoever.</strong> The mobile app operates without collecting, storing, or transmitting any personal information, usage data, device information, or any other data from your device. All functionality is provided without any data collection.
              </p>
              <p className="text-text-muted mb-4">
                If we implement data collection features in the mobile application in the future, we will update this Privacy Policy to reflect those changes and notify users accordingly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">3. How We Use Your Information</h2>
              <p className="text-text-muted mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li>Provide, maintain, and improve the Platform and our services</li>
                <li>Process tournament registrations and payments</li>
                <li>Manage your account and provide customer support</li>
                <li>Send you important updates about tournaments, your account, and our services</li>
                <li>Display tournament results, leaderboards, and performance statistics</li>
                <li>Facilitate communication between tournament directors and participants</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
                <li>Send you marketing communications (with your consent, which you can opt out of)</li>
                <li>Conduct analytics and research to improve our services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">4. How We Share Your Information</h2>
              <p className="text-text-muted mb-4">We may share your information in the following circumstances:</p>
              
              <h3 className="text-xl font-semibold text-text-muted mb-3">4.1 Public Information</h3>
              <p className="text-text-muted mb-4">
                Certain information may be publicly visible, including your name, profile photo, tournament participation, scores, and performance statistics. This information is displayed to help facilitate tournament management and community engagement.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">4.2 Tournament Directors</h3>
              <p className="text-text-muted mb-4">
                When you register for a tournament, the tournament director will have access to your registration information, contact details, and scores for the purpose of managing the tournament.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">4.3 Service Providers</h3>
              <p className="text-text-muted mb-4">
                We may share information with third-party service providers who perform services on our behalf, such as payment processing, data analytics, email delivery, hosting, and customer support.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">4.4 Legal Requirements</h3>
              <p className="text-text-muted mb-4">
                We may disclose information if required by law, court order, or government regulation, or if we believe disclosure is necessary to protect our rights, property, or safety, or that of our users or others.
              </p>

              <h3 className="text-xl font-semibold text-text-muted mb-3">4.5 Business Transfers</h3>
              <p className="text-text-muted mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">5. Data Security</h2>
              <p className="text-text-muted mb-4">
                We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption, secure servers, access controls, and regular security assessments.
              </p>
              <p className="text-text-muted mb-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">6. Your Privacy Rights</h2>
              <p className="text-text-muted mb-4">Depending on your location, you may have certain rights regarding your personal information:</p>
              <ul className="list-disc pl-6 text-text-muted mb-4 space-y-2">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Objection:</strong> Object to certain processing of your information</li>
                <li><strong>Restriction:</strong> Request restriction of processing your information</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for processing where consent is the legal basis</li>
              </ul>
              <p className="text-text-muted mb-4">
                To exercise these rights, please contact us using the information provided in the Contact section below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">7. Children's Privacy</h2>
              <p className="text-text-muted mb-4">
                The Platform is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </p>
              <p className="text-text-muted mb-4">
                For users between 13 and 18, we require parental consent for account creation and tournament participation in accordance with applicable laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">8. Data Retention</h2>
              <p className="text-text-muted mb-4">
                We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal purposes.
              </p>
              <p className="text-text-muted mb-4">
                Tournament results and historical data may be retained for statistical and historical purposes even after account deletion, but will be anonymized where possible.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">9. International Data Transfers</h2>
              <p className="text-text-muted mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. We take appropriate safeguards to ensure your information receives adequate protection.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">10. Cookies and Tracking Technologies</h2>
              <h3 className="text-xl font-semibold text-text-muted mb-3">10.1 Web Application</h3>
              <p className="text-text-muted mb-4">
                Our web application uses cookies and similar tracking technologies to collect and use information about you. For more information about our use of cookies, please see our <Link to="/cookies" className="text-primary hover:text-primary-light underline">Cookie Policy</Link>.
              </p>
              <h3 className="text-xl font-semibold text-text-muted mb-3">10.2 Mobile Application</h3>
              <p className="text-text-muted mb-4">
                Our mobile application does not use cookies or similar tracking technologies. As stated in Section 2.4, the mobile app currently does not collect any data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">11. Third-Party Links</h2>
              <p className="text-text-muted mb-4">
                The Platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-text-muted mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-text mb-4">13. Contact Us</h2>
              <p className="text-text-muted mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at <a href="mailto:support@victorybowling.com" className="text-primary hover:text-primary-light underline">support@victorybowling.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
