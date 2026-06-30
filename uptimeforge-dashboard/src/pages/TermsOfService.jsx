import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import UWLogo from '../components/UWLogo';

const EFFECTIVE_DATE = 'June 1, 2026';
const CONTACT_EMAIL  = 'uptimeforge@gmail.com';
const OPERATOR_NAME  = 'Narendra Singh';
const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://uptimeforge.narendrasingh.site';

export default function TermsOfService() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="tos-page">

      {/* ── top nav ── */}
      <nav className="tos-nav">
        <a href={LANDING_URL} className="tos-nav-brand">
          <UWLogo size={28} />
          <span>UptimeForge</span>
        </a>
        <a href={LANDING_URL} className="tos-nav-back">← Back to Home</a>
      </nav>

      <div className="tos-wrap">

        {/* ── page header ── */}
        <div className="tos-header">
          <h1>Terms of Service</h1>
          <p className="tos-effective">Effective Date: {EFFECTIVE_DATE}</p>
          <p className="tos-intro">
            Please read these Terms of Service carefully before using UptimeForge.
            By creating an account or using our Service you agree to be legally bound
            by these terms. If you do not agree, you must not use the Service.
          </p>
        </div>

        <div className="tos-body">

          {/* 1 */}
          <section className="tos-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using <strong>UptimeForge</strong> ("the Service"), operated by{' '}
              <strong>{OPERATOR_NAME}</strong> ("we", "us", "our"), you confirm that you have read,
              understood, and agree to be bound by these Terms of Service ("Terms") and our Privacy
              Policy. These Terms apply to all visitors, registered users, and anyone who accesses
              or uses the Service in any capacity.
            </p>
          </section>

          {/* 2 */}
          <section className="tos-section">
            <h2>2. Description of Service</h2>
            <p>
              UptimeForge is an all-in-one monitoring platform that provides the following services
              to its registered users:
            </p>
            <ul>
              <li>24/7 automated HTTP/HTTPS uptime checks at configurable intervals (30 seconds to 5 minutes based on plan)</li>
              <li>TCP Port Monitoring — verifies that specific TCP ports (SMTP, FTP, SSH, MySQL, and custom ports) are reachable</li>
              <li>ICMP Ping Monitoring — real ping checks for servers, routers, and network devices</li>
              <li>DNS Record Monitoring — verifies that A, AAAA, CNAME, MX, TXT, NS, SOA, PTR, SRV, and SPF records resolve to expected values</li>
              <li>UDP Service Monitoring — multi-probe packet-loss checks for DNS, SNMP, NTP, Syslog, and other UDP services</li>
              <li>API Monitoring — HTTP request checks with JSON response body assertions</li>
              <li>SSL certificate expiry monitoring and advance warnings</li>
              <li>Domain name expiry tracking via WHOIS lookups</li>
              <li>Response time performance analytics and historical charts</li>
              <li>Incident tracking with timestamps and resolution logs</li>
              <li>Weekly and monthly PDF performance reports delivered by email</li>
              <li>Real-time downtime and alert notifications via Email, WhatsApp, Telegram, Slack, Discord, Rocket.Chat, and custom Webhooks</li>
            </ul>
            <p>
              The Service is provided on an "as-is" basis. We reserve the right to modify, add,
              or discontinue features at any time with reasonable notice.
            </p>
          </section>

          {/* 3 */}
          <section className="tos-section">
            <h2>3. User Accounts</h2>

            <h3>3.1 Registration Requirements</h3>
            <p>
              To use the Service you must register with a valid full name, email address, and mobile
              phone number. Registration requires OTP (one-time password) verification to confirm
              your mobile number. Providing false or inaccurate information is a violation of these
              Terms and may result in immediate account termination.
            </p>

            <h3>3.2 Age Requirement</h3>
            <p>
              You must be at least <strong>18 years of age</strong> to create an account. By
              registering you represent and warrant that you meet this age requirement.
            </p>

            <h3>3.3 Account Security</h3>
            <p>
              You are solely responsible for maintaining the confidentiality of your login credentials.
              You agree to notify us immediately at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you believe your account
              has been compromised or accessed without your authorization. We are not liable for any
              loss resulting from unauthorized use of your account.
            </p>

            <h3>3.4 One Account per Person</h3>
            <p>
              Each individual may maintain only one active account. Creating multiple accounts to
              circumvent payment requirements, usage limits, or any service restriction is strictly
              prohibited and will result in termination of all associated accounts.
            </p>
          </section>

          {/* 4 */}
          <section className="tos-section">
            <h2>4. Payments and Billing</h2>

            <h3>4.1 Payment Method</h3>
            <p>
              UptimeForge processes all payments securely through <strong>Razorpay</strong>, a
              PCI-DSS compliant payment gateway. We accept the following payment methods:
            </p>
            <ul>
              <li><strong>UPI</strong> — PhonePe, Google Pay, Paytm, BHIM, Amazon Pay, and all UPI-compatible apps</li>
              <li><strong>Debit / Credit Cards</strong> — Visa, Mastercard, RuPay, and other major card networks</li>
              <li><strong>Net Banking</strong> — all major Indian banks</li>
            </ul>
            <p>
              We do not accept international payments, cryptocurrency, or cash. Payment credentials
              (card numbers, UPI PINs, bank passwords) are entered directly on Razorpay's secure
              checkout and are never stored or accessible by UptimeForge.
            </p>

            <h3>4.2 Free Trial Verification Fee — ₹2</h3>
            <p>
              To activate your 5-day free trial, a <strong>one-time, non-refundable ₹2 UPI
              payment</strong> is required at registration. This fee:
            </p>
            <ul>
              <li>Verifies that your UPI account is active and operational</li>
              <li>Prevents fraudulent or duplicate account creation</li>
              <li>Activates your 5-day full-access free trial</li>
            </ul>
            <p>
              This fee is collected in advance and is <strong>strictly non-refundable</strong> under
              all circumstances, including if you do not use the trial or decide not to continue.
            </p>

            <h3>4.3 Subscription Plans and Pricing</h3>
            <p>
              After the free trial, continued access requires a monthly subscription. Current pricing:
            </p>
            <div className="tos-plan-table">
              <div className="tos-plan-row tos-plan-head">
                <span>Plan</span><span>Price</span><span>Sites Included</span>
              </div>
              <div className="tos-plan-row">
                <span>Bronze</span><span>₹499 / month</span><span>5 sites</span>
              </div>
              <div className="tos-plan-row">
                <span>Silver</span><span>₹999 / month</span><span>15 sites</span>
              </div>
              <div className="tos-plan-row">
                <span>Gold</span><span>₹1,499 / month</span><span>30 sites</span>
              </div>
            </div>
            <p>
              Pricing is subject to change. Active subscribers will be notified at least{' '}
              <strong>30 days in advance</strong> of any price increases.
            </p>

            <h3>4.4 Plan Activation Timeline</h3>
            <p>
              Payments are verified automatically and instantly via Razorpay's cryptographic signature
              system. Your plan is typically activated <strong>within seconds</strong> of a successful
              payment. You will receive an email confirmation once your plan is active. In rare cases
              of payment gateway delays, activation may take up to <strong>30 minutes</strong>. If
              your plan is not activated within this window, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your payment reference.
            </p>

            <h3>4.5 No Auto-Renewal — No Standing Instructions</h3>
            <p>
              UptimeForge does <strong>NOT</strong> set up any auto-debit mandates, recurring UPI
              instructions, or automatic renewals. You will never be charged without initiating a
              payment yourself. Your plan will simply expire at the end of the billing period and you
              can choose to renew manually. You will receive a reminder email before your plan expires.
            </p>

            <h3>4.6 Refund Policy</h3>
            <p>
              The ₹2 trial verification fee is <strong>strictly non-refundable</strong>. For monthly
              subscription payments, refunds are not provided for the current billing month or any
              unused portion of a plan. If you believe a payment was made in error (e.g., duplicate
              payment), contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> within{' '}
              <strong>7 days</strong> of the transaction with your UPI transaction reference number
              (UTR). We will review such requests on a case-by-case basis.
            </p>
          </section>

          {/* 5 */}
          <section className="tos-section">
            <h2>5. Acceptable Use Policy</h2>
            <p>
              By using UptimeForge, you agree that you will not, directly or indirectly:
            </p>
            <ul>
              <li>Monitor websites, servers, or domains that you do not own or do not have explicit written permission to monitor</li>
              <li>Use the monitoring infrastructure to conduct or facilitate DDoS attacks, traffic flooding, or any form of network abuse against third parties</li>
              <li>Use monitoring checks to probe for security vulnerabilities in systems you do not own</li>
              <li>Submit false, fabricated, or fraudulent payment transaction references</li>
              <li>Register accounts using another person's identity, false names, or fake contact details</li>
              <li>Share your account with others or resell access to the Service</li>
              <li>Attempt to reverse-engineer, decompile, scrape, or tamper with the platform or its underlying systems</li>
              <li>Circumvent any rate limits, usage limits, or security measures imposed by the platform</li>
              <li>Use the Service for any purpose that is illegal under applicable Indian or international law</li>
            </ul>
            <p>
              Violation of this section may result in immediate account suspension or termination
              without prior notice and without any refund.
            </p>
          </section>

          {/* 6 */}
          <section className="tos-section">
            <h2>6. Service Availability and Uptime</h2>
            <p>
              We target <strong>99.9% uptime</strong> for our monitoring infrastructure and make
              commercially reasonable efforts to maintain reliable service. However, we do not provide
              a guaranteed Service Level Agreement (SLA). The Service may be unavailable due to:
            </p>
            <ul>
              <li>Scheduled maintenance (communicated in advance where possible)</li>
              <li>Unplanned outages, hardware failures, or third-party service disruptions</li>
              <li>Events beyond our reasonable control (force majeure)</li>
            </ul>
            <p>
              Platform downtime does not automatically entitle users to refunds, service credits, or
              extension of their billing period. Monitoring checks may be delayed or missed during
              platform outages without liability on our part.
            </p>
          </section>

          {/* 7 */}
          <section className="tos-section">
            <h2>7. Data Collection and Privacy</h2>

            <h3>7.1 Information We Collect</h3>
            <p>We collect and process the following categories of data:</p>
            <ul>
              <li><strong>Account data:</strong> Name, email address, phone number, billing address, city, state</li>
              <li><strong>Monitoring data:</strong> URLs you add for monitoring, response times, uptime status history</li>
              <li><strong>Payment data:</strong> UPI transaction reference numbers (UTR). We do not store UPI PINs, bank account numbers, or any sensitive payment credentials</li>
              <li><strong>Alert recipient data:</strong> Email addresses, WhatsApp numbers, Telegram bot tokens, and webhook URLs (Slack, Discord, Rocket.Chat) you configure for notifications</li>
              <li><strong>Usage data:</strong> Login activity, feature usage, and error logs for service improvement</li>
            </ul>

            <h3>7.2 How We Use Your Data</h3>
            <p>
              Your data is used exclusively to provide and improve the Service — to monitor your sites,
              deliver alerts, manage your subscription, and communicate account-related information.
              We do <strong>not</strong> sell, rent, or share your personal data with third parties
              for marketing or advertising purposes.
            </p>

            <h3>7.3 Data Security</h3>
            <p>
              All passwords are stored using industry-standard cryptographic hashing (bcrypt). All
              data in transit is protected via HTTPS/TLS encryption. While we implement appropriate
              security measures, no online service can guarantee absolute security against all threats.
            </p>

            <h3>7.4 Data Retention and Deletion</h3>
            <p>
              Account data is retained for the duration of your account plus <strong>90 days</strong>{' '}
              following deletion. Monitoring history and logs are retained for up to 90 days. To
              request deletion of your data, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will process deletion
              requests within 30 days.
            </p>
          </section>

          {/* 8 */}
          <section className="tos-section">
            <h2>8. Intellectual Property</h2>
            <p>
              All content, branding, design, code, and features of UptimeForge are the intellectual
              property of <strong>{OPERATOR_NAME}</strong>. You may not copy, reproduce, modify,
              distribute, or create derivative works from any part of the platform without prior
              written permission.
            </p>
            <p>
              You retain full ownership of the URLs, domain names, and content you input into the
              platform. By using the Service, you grant us a limited, non-exclusive, royalty-free
              license to access and process your input data solely for the purpose of providing
              the monitoring and alert services.
            </p>
          </section>

          {/* 9 */}
          <section className="tos-section">
            <h2>9. Third-Party Services</h2>
            <p>
              UptimeForge integrates with third-party services to deliver its functionality. These
              include (but are not limited to):
            </p>
            <ul>
              <li><strong>Razorpay</strong> — payment processing (UPI, Cards, Netbanking)</li>
              <li><strong>WHOIS data providers</strong> — domain expiry lookups</li>
              <li><strong>Email delivery providers</strong> — transactional alert emails</li>
              <li><strong>WhatsApp Business API</strong> — WhatsApp alert messages</li>
              <li><strong>Telegram Bot API</strong> — Telegram alert messages</li>
              <li><strong>Slack, Discord, Rocket.Chat</strong> — webhook-based alert notifications</li>
            </ul>
            <p>
              We are not responsible for the accuracy, availability, pricing changes, or terms of
              these third-party services. Missed alerts due to delivery failures, rate limits, or
              outages at any third-party provider are not our liability.
            </p>
          </section>

          {/* 10 */}
          <section className="tos-section">
            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, UptimeForge and{' '}
              <strong>{OPERATOR_NAME}</strong> shall not be liable for:
            </p>
            <ul>
              <li>Any loss of revenue, profit, data, or business opportunity resulting from monitoring failures, missed alerts, or service downtime</li>
              <li>Inaccurate or outdated WHOIS, SSL, or domain data obtained from third-party sources</li>
              <li>Alerts not delivered due to third-party email, WhatsApp, Telegram, Slack, Discord, or webhook service failures</li>
              <li>Any indirect, incidental, special, consequential, or punitive damages arising from use of or inability to use the Service</li>
              <li>Security breaches resulting from events beyond our reasonable control</li>
            </ul>
            <p>
              In any case, our total cumulative liability to you shall not exceed the total amount
              paid by you for the Service during the <strong>30-day period</strong> immediately
              preceding the event giving rise to the claim.
            </p>
          </section>

          {/* 11 */}
          <section className="tos-section">
            <h2>11. Account Termination</h2>

            <h3>11.1 Termination by You</h3>
            <p>
              You may terminate your account at any time by contacting us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Upon termination, your access
              to the Service will cease and your monitored sites will no longer be checked.
            </p>

            <h3>11.2 Termination by Us</h3>
            <p>
              We reserve the right to suspend or permanently terminate accounts that:
            </p>
            <ul>
              <li>Violate these Terms or our Acceptable Use Policy</li>
              <li>Engage in fraudulent payment activity or chargebacks</li>
              <li>Have been inactive for more than <strong>12 consecutive months</strong></li>
              <li>Pose a security risk to the platform or other users</li>
            </ul>
            <p>
              In cases of serious violations, termination may occur without prior notice or refund.
            </p>

            <h3>11.3 Effect of Termination</h3>
            <p>
              Upon termination (by either party), we are under no obligation to retain your data
              beyond the 90-day retention window. Provisions of these Terms that by their nature
              should survive termination (including payment obligations, limitation of liability,
              and intellectual property rights) shall survive.
            </p>
          </section>

          {/* 12 */}
          <section className="tos-section">
            <h2>12. Modifications to These Terms</h2>
            <p>
              We reserve the right to update or modify these Terms at any time. For material changes
              that affect user rights or payment obligations, we will notify active users via email at
              least <strong>14 days before</strong> the changes take effect.
            </p>
            <p>
              Your continued use of the Service after the effective date of revised Terms constitutes
              your acceptance of those changes. If you do not agree to the updated Terms, you must
              discontinue use of the Service before the effective date.
            </p>
          </section>

          {/* 13 */}
          <section className="tos-section">
            <h2>13. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of{' '}
              <strong>India</strong>, without regard to conflict of law principles. Any disputes
              arising under or in connection with these Terms shall be subject to the exclusive
              jurisdiction of the competent courts located in <strong>India</strong>.
            </p>
            <p>
              Before initiating formal legal proceedings, you agree to first contact us in good faith
              at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to attempt to resolve the
              dispute informally. We will respond within 5 business days.
            </p>
          </section>

          {/* 14 */}
          <section className="tos-section">
            <h2>14. Miscellaneous</h2>
            <ul>
              <li>
                <strong>Entire Agreement:</strong> These Terms constitute the entire agreement between
                you and UptimeForge regarding the Service and supersede all prior agreements.
              </li>
              <li>
                <strong>Severability:</strong> If any provision of these Terms is found to be
                unenforceable, the remaining provisions will continue in full force.
              </li>
              <li>
                <strong>No Waiver:</strong> Our failure to enforce any right or provision of these
                Terms shall not constitute a waiver of that right.
              </li>
              <li>
                <strong>Language:</strong> These Terms are written in English. In case of any
                discrepancy between translated versions, the English version shall prevail.
              </li>
            </ul>
          </section>

          {/* 15 */}
          <section className="tos-section">
            <h2>15. Contact Information</h2>
            <p>
              For any questions, concerns, or formal notices regarding these Terms of Service or your
              account, please reach out to us:
            </p>
            <div className="tos-contact-box">
              <div className="tos-contact-row">
                <span className="tos-contact-label">Service</span>
                <span>UptimeForge — All-in-One Monitoring Platform</span>
              </div>
              <div className="tos-contact-row">
                <span className="tos-contact-label">Website</span>
                <span><a href={LANDING_URL} target="_blank" rel="noopener noreferrer">{LANDING_URL}</a></span>
              </div>
              <div className="tos-contact-row">
                <span className="tos-contact-label">Operated by</span>
                <span>{OPERATOR_NAME}</span>
              </div>
              <div className="tos-contact-row">
                <span className="tos-contact-label">Email</span>
                <span><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></span>
              </div>
              <div className="tos-contact-row">
                <span className="tos-contact-label">Response Time</span>
                <span>Within 4–5 business days</span>
              </div>
            </div>
          </section>

        </div>

        {/* ── page footer ── */}
        <div className="tos-footer-bar">
          <p>© 2026 UptimeForge · Operated by {OPERATOR_NAME} · All rights reserved</p>
          <div className="tos-footer-links">
            <a href={LANDING_URL}>Home</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
