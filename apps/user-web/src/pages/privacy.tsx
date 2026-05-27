import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Eye,
  FileText,
  Globe,
  Mail,
  Database,
  UserCheck,
  Baby,
  RefreshCw,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { SeoHead } from '@/components/seo/SeoHead';

const LAST_UPDATED = 'April 30, 2026';
const EFFECTIVE_DATE = 'May 1, 2026';

const quickFacts = [
  {
    icon: Eye,
    title: 'Only what we need',
    body: 'We ask for your name, email, phone, and (optionally) location — nothing more — so we can book and track your appointments.',
  },
  {
    icon: Shield,
    title: 'Your data, your rules',
    body: 'Export, correct, or permanently delete your account at any time from Profile → Settings.',
  },
  {
    icon: Lock,
    title: 'No data sales, ever',
    body: 'We do not sell, rent, or trade your personal information to advertisers or data brokers.',
  },
  {
    icon: Server,
    title: 'Encrypted end to end',
    body: 'Connections are served over TLS 1.2+, and sensitive fields are hashed or encrypted at rest.',
  },
];

const sections: Array<{
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}> = [
  {
    id: 'who-we-are',
    icon: FileText,
    title: '1. Who We Are',
    body: (
      <>
        <p>
          Overline (&ldquo;Overline&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is an India-based
          service-booking platform operated at <a href="https://overline.in" className="underline">overline.in</a>. We
          help customers discover and reserve time slots at verified salons, barbershops, spas, clinics, fitness studios,
          and similar in-person service providers (&ldquo;Shops&rdquo;), and we give those Shops the scheduling and
          queue-management tools they need to run their businesses.
        </p>
        <p className="mt-3">
          This Privacy Policy describes the personal information we collect, why we collect it, how we use and share it,
          and the choices and rights you have. It applies to the Overline website, mobile experience, and APIs (together,
          the &ldquo;Service&rdquo;).
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    icon: Database,
    title: '2. Information We Collect',
    body: (
      <>
        <p>We limit collection to data that is strictly necessary to run the Service. Specifically:</p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>
            <strong>Account data</strong> &mdash; name, email address, phone number, profile picture, preferred language,
            and the authentication provider you used to sign in (email/password, phone OTP via WhatsApp, or Google).
          </li>
          <li>
            <strong>Booking data</strong> &mdash; the Shops and services you browse and book, appointment dates and
            times, notes you leave for the Shop, cancellations, no-shows, reviews, and staff preferences.
          </li>
          <li>
            <strong>Payment metadata</strong> &mdash; we do not store full card numbers or bank details. Our payment
            partner, Razorpay, tokenizes your payment instrument on their PCI-DSS Level 1 infrastructure. We retain only
            an order ID, payment ID, amount, currency, and status.
          </li>
          <li>
            <strong>Location data</strong> &mdash; if you grant permission in your browser or mobile app, we use your
            coordinates (latitude and longitude) solely to show you nearby Shops and compute routes. You can revoke this at any time
            from your browser or device settings.
          </li>
          <li>
            <strong>Camera & Photos access</strong> &mdash; on the mobile app, if you grant permission, we access your device camera
            and photo gallery to allow you to upload profile pictures, share service references with staff, upload shop gallery items,
            or submit photo attachments with your completed service reviews.
          </li>
          <li>
            <strong>Push Notification tokens</strong> &mdash; we collect your device's FCM token to send real-time alerts about queue status updates,
            booking confirmations, and payment receipts.
          </li>
          <li>
            <strong>Device and usage data</strong> &mdash; device type, operating system, browser, IP address, crash
            reports, and anonymized usage metrics to diagnose bugs and improve the product.
          </li>
          <li>
            <strong>Communications</strong> &mdash; copies of support requests, feedback, and in-app chats with a Shop
            related to a booking.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'google-disclosure',
    icon: UserCheck,
    title: '3. Google User Data Disclosure',
    body: (
      <>
        <p>
          Overline&rsquo;s use of information received from Google APIs adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p className="mt-3">When you choose &ldquo;Sign in with Google&rdquo;, we request the following scopes:</p>
        <ul className="mt-2 space-y-1 list-disc pl-6">
          <li>
            <code className="text-sm">openid</code>, <code className="text-sm">email</code>,{' '}
            <code className="text-sm">profile</code> &mdash; to identify your account, create a unique Overline profile,
            and display your name and avatar in the app.
          </li>
        </ul>
        <p className="mt-3">
          We request <strong>no</strong> other Google scopes (Gmail, Drive, Calendar, Contacts, etc. are not accessed).
          Google account data is used <strong>only</strong> to authenticate you and to send transactional booking
          confirmations to the email address you signed up with. We do not sell, transfer, or disclose your Google data
          to third parties, and we do not use it for advertising, training AI models, or any purpose unrelated to the
          user-facing Overline features you use.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use',
    icon: Globe,
    title: '4. How We Use Your Information',
    body: (
      <>
        <p>We use your information to:</p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Create and secure your account, and authenticate you across sessions.</li>
          <li>Process bookings, cancellations, refunds, and wallet transactions.</li>
          <li>
            Send transactional messages you explicitly need &mdash; booking confirmations, reminders, cancellations,
            receipts, and OTPs &mdash; via email, WhatsApp, or in-app notifications.
          </li>
          <li>Recommend nearby or relevant Shops based on your location preference and booking history.</li>
          <li>Prevent fraud, abuse, and misuse (including rate-limit enforcement and device-level checks).</li>
          <li>Comply with applicable laws, tax filings, and legitimate regulatory requests.</li>
          <li>Improve the Service through aggregated, de-identified analytics.</li>
        </ul>
        <p className="mt-3">
          We do <strong>not</strong> sell your personal information. We do <strong>not</strong> use your content to train
          third-party AI models.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    icon: Lock,
    title: '5. When We Share Information',
    body: (
      <>
        <p>We share information only in the following limited cases:</p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>
            <strong>With Shops you book.</strong> When you confirm a booking, the Shop receives your name, phone number,
            selected service(s), date/time, and any notes you add. Each Shop is an independent business and has its own
            privacy practices; we encourage you to review them.
          </li>
          <li>
            <strong>With processors under contract.</strong> Trusted vendors help us run the Service (for example,
            Razorpay for payments, SendGrid for transactional email, Meta for WhatsApp OTP delivery, Cloudflare/Caddy for
            DNS and edge security, AWS for hosting, Supabase for database hosting, Upstash for Redis). Each is bound by a
            Data Processing Agreement and may process your data only as directed by us.
          </li>
          <li>
            <strong>For safety and legal reasons.</strong> To respond to a lawful government request, enforce our Terms,
            or protect the rights, property, or safety of users, the public, or Overline.
          </li>
          <li>
            <strong>During a business transfer.</strong> If Overline is ever acquired or merges with another company,
            user data would transfer under the same privacy commitments, and we would notify you in advance.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'retention',
    icon: RefreshCw,
    title: '6. How Long We Keep Data',
    body: (
      <>
        <p>
          We keep your account information for as long as your account is active. When you delete your account, we remove
          personal identifiers within 30 days, except where we must retain certain records to:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>complete a pending transaction or refund,</li>
          <li>comply with tax, accounting, or anti-fraud laws (typically up to 8 years under Indian law),</li>
          <li>resolve disputes or enforce our agreements.</li>
        </ul>
        <p className="mt-3">
          After these obligations expire, residual data is either deleted or irreversibly de-identified.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    icon: Shield,
    title: '7. Security',
    body: (
      <>
        <p>We protect your data with defense-in-depth:</p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>All traffic is served over HTTPS (TLS 1.2+). HSTS is enforced.</li>
          <li>Passwords are hashed with bcrypt. OTPs expire within 5 minutes.</li>
          <li>Database and Redis connections require TLS and are scoped to a private network.</li>
          <li>Least-privilege IAM, rotated secrets, and audit logging on administrative actions.</li>
          <li>Rate-limiting, bot detection, and a fraud-scoring pipeline on sensitive endpoints.</li>
        </ul>
        <p className="mt-3">
          No internet service is 100% secure. If we ever discover a breach that affects your personal data, we will
          notify you and the relevant regulators within the timeframes required by applicable law.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    icon: UserCheck,
    title: '8. Your Rights & Choices',
    body: (
      <>
        <p>You can, at any time:</p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Access and download a copy of your data from Profile &rarr; Settings &rarr; Export.</li>
          <li>Correct inaccurate information directly in your profile.</li>
          <li>Delete your account, which triggers the 30-day erasure process described above.</li>
          <li>Revoke marketing emails via the unsubscribe link (transactional emails cannot be disabled while your account is active).</li>
          <li>
            Revoke the Google OAuth grant from{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              your Google Account permissions page
            </a>
            .
          </li>
          <li>
            Lodge a complaint with the office of the Data Protection Officer (see section 11) or with your local data
            protection authority.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'children',
    icon: Baby,
    title: '9. Children',
    body: (
      <p>
        Overline is not directed to children under 18. We do not knowingly collect information from anyone under 18. If
        you believe a minor has created an account, please contact us and we will promptly delete the account.
      </p>
    ),
  },
  {
    id: 'international',
    icon: Globe,
    title: '10. International Transfers',
    body: (
      <p>
        Our primary infrastructure is hosted in the Asia-Pacific (Mumbai) region. Some sub-processors (for example email
        delivery) may store data in the United States or European Union under appropriate safeguards such as Standard
        Contractual Clauses. By using the Service you consent to these transfers where permitted by applicable law.
      </p>
    ),
  },
  {
    id: 'contact',
    icon: Mail,
    title: '11. Contact & Grievance Officer',
    body: (
      <>
        <p>
          For any privacy question, data request, or concern, reach out to our Grievance Officer (as required under the
          Indian IT Rules 2011 and DPDP Act 2023):
        </p>
        <div className="mt-3 p-4 rounded-2xl bg-surface-container-high border border-outline-variant/20">
          <p className="font-semibold">Grievance Officer &mdash; Overline</p>
          <p>
            Email: <a href="mailto:privacy@overline.in" className="underline">privacy@overline.in</a>
          </p>
          <p>
            Support: <a href="mailto:support@overline.in" className="underline">support@overline.in</a>
          </p>
          <p>We aim to acknowledge all requests within 72 hours and resolve them within 30 days.</p>
        </div>
      </>
    ),
  },
  {
    id: 'changes',
    icon: RefreshCw,
    title: '12. Changes to this Policy',
    body: (
      <p>
        We may update this Policy as the Service evolves. Material changes will be announced in-app or by email at least
        14 days before they take effect. The &ldquo;Last Updated&rdquo; date at the top reflects the most recent
        revision.
      </p>
    ),
  },
];

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-surface">
      <SeoHead
        title="Privacy Policy"
        description="How Overline collects, uses, and protects your data when you book salons, spas, clinics, and gyms. DPDP 2023 compliant."
        canonical="/privacy"
      />

      {/* Hero */}
      <section className="pt-24 pb-16 px-6 lg:px-8 bg-inverse-surface text-inverse-on-surface rounded-b-4xl md:rounded-b-5xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-fixed/20 text-primary-fixed mb-6 border border-primary-fixed/30"
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Legal</span>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-6">
            Privacy <br />
            <span className="text-inverse-on-surface/40">Policy</span>
          </h1>
          <p className="text-lg md:text-xl text-inverse-on-surface/60 max-w-2xl leading-relaxed">
            Plain-language privacy practices for everyone who books salons, spas, clinics, and gyms on Overline. No
            dark patterns. No data sales. No tracking you across the internet.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-inverse-on-surface/60">
            <span>
              <strong className="text-inverse-on-surface">Effective:</strong> {EFFECTIVE_DATE}
            </span>
            <span>
              <strong className="text-inverse-on-surface">Last updated:</strong> {LAST_UPDATED}
            </span>
          </div>
        </div>
      </section>

      {/* Quick facts */}
      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">At a glance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickFacts.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/10"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-black text-on-surface mb-2 leading-tight">{f.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOC + full sections */}
      <section className="pb-20 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">
          <nav aria-label="Table of contents" className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/10">
            <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Contents</h2>
            <ol className="list-decimal pl-5 space-y-1 text-on-surface-variant">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="hover:text-primary transition-colors">
                    {s.title.replace(/^\d+\.\s*/, '')}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {sections.map((s) => (
            <motion.article
              key={s.id}
              id={s.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="scroll-mt-24 p-8 md:p-10 rounded-4xl bg-surface-container-low border border-outline-variant/10"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <s.icon className="w-6 h-6" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">{s.title}</h2>
              </div>
              <div className="text-on-surface-variant leading-relaxed text-[15px] md:text-base">{s.body}</div>
            </motion.article>
          ))}

          <div className="p-8 md:p-10 rounded-4xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black text-on-surface tracking-tight">Manage your data</h3>
              <p className="text-on-surface-variant mt-1">Export, correct, or delete your account from your profile.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/profile">
                <Button className="rounded-xl px-6 py-3 font-bold bg-primary text-white">Profile Settings</Button>
              </Link>
              <Link href="/terms">
                <Button variant="ghost" className="rounded-xl px-6 py-3 font-bold">
                  Read Terms
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
