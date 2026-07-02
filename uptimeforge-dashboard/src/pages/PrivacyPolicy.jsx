import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import UWLogo from '../components/UWLogo';

const EFFECTIVE_DATE = 'June 30, 2026';
const CONTACT_EMAIL  = 'uptimeforge@gmail.com';
const OPERATOR_NAME  = 'Narendra Singh';
const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://uptimeforge.narendrasingh.site';

export default function PrivacyPolicy() {
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
          <h1>Privacy Policy</h1>
          <p className="tos-effective">Effective Date: {EFFECTIVE_DATE}</p>
          <p className="tos-intro">
            UptimeForge ("we", "us", or "our") is committed to protecting your personal information.
            This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.
          </p>
        </div>

        <div className="tos-body">

          {/* 1. Information We Collect */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">1.</span> Information We Collect</h2>
            <h3>1.1 Account Information</h3>
            <p>When you register, we collect:</p>
            <ul>
              <li>Full name, email address, phone number</li>
              <li>City, state, country, and pincode</li>
              <li>Password (stored as a bcrypt hash — never in plain text)</li>
            </ul>
            <h3>1.2 Monitoring Configuration</h3>
            <p>We collect the URLs, IP addresses, hostnames, ports, and other targets you add for monitoring purposes. This data is required to perform the monitoring service.</p>
            <h3>1.3 Payment Information</h3>
            <p>
              Payments are processed via <strong>Razorpay</strong>. We store only the Razorpay payment reference ID,
              amount, and transaction status. We do <strong>not</strong> store card numbers, CVVs, UPI PINs, net
              banking passwords, or any other sensitive payment credentials.
            </p>
            <h3>1.4 Usage Data</h3>
            <p>We may collect technical data such as IP addresses, browser type, and access timestamps for security, abuse prevention, and service improvement.</p>
            <h3>1.5 Notification Credentials</h3>
            <p>
              If you configure integrations (Telegram, Slack, Discord, Rocket.Chat, Webhook), we store only
              the credentials necessary to deliver alerts (e.g., bot tokens, channel IDs, webhook URLs).
              These are stored encrypted and are never shared with third parties.
            </p>
          </section>

          {/* 2. How We Use Your Information */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">2.</span> How We Use Your Information</h2>
            <ul>
              <li>To provide, operate, and improve the UptimeForge monitoring service</li>
              <li>To send uptime/downtime alert notifications via Email, Telegram, Slack, Discord, Rocket.Chat, or Webhook</li>
              <li>To process payments and issue invoices</li>
              <li>To send account-related communications (plan expiry, follow-up emails)</li>
              <li>To detect and prevent fraud, abuse, or unauthorized access</li>
              <li>To comply with applicable legal obligations</li>
            </ul>
            <p>We do <strong>not</strong> sell, rent, or trade your personal information to any third party for marketing purposes.</p>
          </section>

          {/* 3. Data Storage and Security */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">3.</span> Data Storage and Security</h2>
            <p>Your data is stored on servers hosted on <strong>AWS (Amazon Web Services)</strong> in India. We implement industry-standard security measures including:</p>
            <ul>
              <li>Encrypted HTTPS connections (TLS) for all data in transit</li>
              <li>Bcrypt hashing for passwords</li>
              <li>Encrypted storage for sensitive integration credentials</li>
              <li>Access controls limiting who can view your data</li>
            </ul>
            <p>While we take reasonable precautions, no system is completely secure. In the event of a data breach that affects your personal information, we will notify you as required by applicable law.</p>
          </section>

          {/* 4. Cookies */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">4.</span> Cookies</h2>
            <p>
              We use a single <strong>HttpOnly session cookie</strong> to keep you logged in. This cookie does not
              track you across other websites and is not used for advertising. We do not use third-party tracking
              cookies or analytics cookies.
            </p>
          </section>

          {/* 5. Third-Party Services */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">5.</span> Third-Party Services</h2>
            <p>UptimeForge uses the following third-party services, each with their own privacy policies:</p>
            <ul>
              <li><strong>Razorpay</strong> — Payment processing (<a href="https://razorpay.com/privacy/" target="_blank" rel="noreferrer">razorpay.com/privacy</a>)</li>
              <li><strong>Telegram Bot API</strong> — Alert delivery via Telegram</li>
              <li><strong>Slack API</strong> — Alert delivery via Slack</li>
              <li><strong>Discord API</strong> — Alert delivery via Discord</li>
              <li><strong>AWS</strong> — Cloud hosting and infrastructure</li>
            </ul>
            <p>We share only the minimum data required for each service to function.</p>
          </section>

          {/* 6. Data Retention */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">6.</span> Data Retention</h2>
            <p>We retain your account data for as long as your account is active. If you delete your account:</p>
            <ul>
              <li>Your personal information is permanently deleted within 30 days</li>
              <li>Payment transaction records may be retained for up to 7 years for legal and tax compliance</li>
              <li>Monitoring history and logs associated with your account are deleted immediately</li>
            </ul>
          </section>

          {/* 7. Your Rights */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">7.</span> Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
              <li><strong>Correction</strong> — Update or correct inaccurate data via your Account Settings</li>
              <li><strong>Deletion</strong> — Request deletion of your account and personal data</li>
              <li><strong>Portability</strong> — Request an export of your data in a structured format</li>
              <li><strong>Withdraw Consent</strong> — Opt out of non-essential communications at any time</li>
            </ul>
            <p>
              To exercise any of these rights, email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              We will respond within 5 business days.
            </p>
          </section>

          {/* 8. Children's Privacy */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">8.</span> Children's Privacy</h2>
            <p>
              UptimeForge is not intended for users under the age of 18. We do not knowingly collect personal
              information from minors. If you believe a minor has provided us with their data, please contact us
              and we will delete it promptly.
            </p>
          </section>

          {/* 9. Changes to This Policy */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">9.</span> Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the Effective Date
              at the top of this page. Continued use of UptimeForge after changes are posted constitutes your
              acceptance of the updated policy.
            </p>
          </section>

          {/* 10. Contact */}
          <section className="tos-section">
            <h2><span className="tos-sec-num">10.</span> Contact Us</h2>
            <p>For privacy-related questions or requests:</p>
            <div className="tos-contact-box">
              <div className="tos-contact-row">
                <span className="tos-contact-label">Operator</span>
                <span>{OPERATOR_NAME}</span>
              </div>
              <div className="tos-contact-row">
                <span className="tos-contact-label">Service</span>
                <span>UptimeForge</span>
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
          <p>© {new Date().getFullYear()} UptimeForge · Operated by {OPERATOR_NAME} · All rights reserved</p>
          <div className="tos-footer-links">
            <a href={LANDING_URL}>Home</a>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Login</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
