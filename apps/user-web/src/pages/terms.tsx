import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Scale,
  FileText,
  Gavel,
  CreditCard,
  CalendarCheck,
  UserX,
  ShieldAlert,
  Wallet,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { SeoHead } from '@/components/seo/SeoHead';

const LAST_UPDATED = 'April 30, 2026';
const EFFECTIVE_DATE = 'May 1, 2026';

const sections: Array<{
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}> = [
  {
    id: 'acceptance',
    icon: Gavel,
    title: '1. Acceptance of these Terms',
    body: (
      <>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement between you and Overline Technologies
          (&ldquo;Overline&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) and govern your use of the Overline website,
          mobile experience, and APIs (the &ldquo;Service&rdquo;). By creating an account, signing in with Google, or
          making a booking, you confirm that you have read, understood, and agree to these Terms and to our{' '}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="mt-3">If you do not agree, please do not use the Service.</p>
      </>
    ),
  },
  {
    id: 'what-overline-is',
    icon: FileText,
    title: '2. What Overline Is',
    body: (
      <>
        <p>
          Overline is a discovery and booking platform that connects customers with independent salons, barbershops,
          spas, clinics, fitness studios, and other service providers (&ldquo;Shops&rdquo;). We are <strong>not</strong>{' '}
          the provider of the services you book; we facilitate scheduling, payments, notifications, queue management,
          and reviews between you and the Shop.
        </p>
        <p className="mt-3">
          Each Shop is an independent business. The quality, safety, legality, accuracy of listings, and delivery of a
          service are the responsibility of the Shop. We take reasonable steps to verify Shops, but we cannot guarantee
          any outcome.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    icon: UserX,
    title: '3. Eligibility & Accounts',
    body: (
      <>
        <p>To use Overline you must:</p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>be at least 18 years old, or access the Service under the supervision of a parent/legal guardian;</li>
          <li>
            provide accurate, current information when creating your account (including a valid phone number and email);
          </li>
          <li>keep your login credentials confidential and notify us promptly of any unauthorized use;</li>
          <li>use the Service only for lawful purposes and in accordance with these Terms.</li>
        </ul>
        <p className="mt-3">
          You are responsible for all activity under your account. If we detect fraud, impersonation, or misuse, we may
          suspend or terminate the account without refund.
        </p>
      </>
    ),
  },
  {
    id: 'bookings',
    icon: CalendarCheck,
    title: '4. Bookings, Cancellations & No-Shows',
    body: (
      <>
        <p>
          When you confirm a booking, Overline transmits your name, phone, selected service(s), time slot, and notes to
          the Shop. The Shop then allocates capacity, a staff member (if assigned), and any required resources.
        </p>
        <p className="mt-3">
          <strong>Cancellations</strong> must follow the cancellation window shown at checkout. Late cancellations may
          forfeit wallet credits or online payments in line with the Shop&rsquo;s policy. Free cancellations remain
          available until the window closes.
        </p>
        <p className="mt-3">
          <strong>No-shows</strong> (missing the appointment without notice) may be recorded against your profile.
          Repeated no-shows can reduce your trust score, limit advance-booking privileges, or result in account
          suspension.
        </p>
        <p className="mt-3">
          <strong>Rescheduling</strong> is available via the booking detail page subject to Shop availability.
        </p>
      </>
    ),
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: '5. Payments, Fees & Taxes',
    body: (
      <>
        <p>Overline supports three payment methods:</p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>
            <strong>Online (Razorpay)</strong> &mdash; UPI, cards, net banking, and popular wallets. Your payment is
            tokenized and processed by Razorpay under their PCI-DSS Level 1 environment. Overline does not store card
            numbers or bank credentials.
          </li>
          <li>
            <strong>Wallet</strong> &mdash; prepaid or promotional credits within Overline, redeemable against eligible
            bookings.
          </li>
          <li>
            <strong>Pay at Shop</strong> &mdash; you pay the Shop directly in cash or via the Shop&rsquo;s point-of-sale
            at the time of service.
          </li>
        </ul>
        <p className="mt-3">
          The price shown at checkout includes all applicable taxes (GST) unless otherwise indicated. A platform
          convenience fee may apply and is disclosed before you pay. Prices are in Indian Rupees (&#8377;) unless
          specified.
        </p>
        <p className="mt-3">
          <strong>Refunds</strong> are issued back to the original payment source and typically reflect within 5&ndash;7
          business days, subject to your bank. Refund eligibility depends on the Shop&rsquo;s cancellation policy shown
          at checkout.
        </p>
      </>
    ),
  },
  {
    id: 'wallet',
    icon: Wallet,
    title: '6. Overline Wallet & Credits',
    body: (
      <>
        <p>
          The Overline Wallet is a closed-loop, non-cash prepaid instrument usable only for bookings on Overline. Key
          rules:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Wallet balances are non-transferable and cannot be withdrawn as cash.</li>
          <li>Promotional credits may carry expiry dates and eligibility conditions disclosed when awarded.</li>
          <li>Any credit balance remaining in a deactivated account is forfeited after 90 days of inactivity.</li>
          <li>We reserve the right to reverse wallet credits issued due to bugs, fraud, or abuse.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'reviews',
    icon: FileText,
    title: '7. Reviews & User Content',
    body: (
      <>
        <p>
          You may leave a review only for a Shop where you completed a booking. Reviews must reflect your own experience,
          must not contain unlawful, hateful, defamatory, sexually explicit, or misleading content, and must not contain
          personal contact information of anyone other than yourself.
        </p>
        <p className="mt-3">
          You grant Overline a worldwide, royalty-free, non-exclusive licence to host, display, reformat, and
          redistribute your reviews and public profile content on the Service for as long as your account is active. You
          remain the owner of the content and can delete it at any time.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    icon: ShieldAlert,
    title: '8. Acceptable Use',
    body: (
      <>
        <p>You agree NOT to:</p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>create fake bookings, impersonate another person, or use the Service to harass Shops or staff;</li>
          <li>attempt to scrape, reverse-engineer, or overload our APIs (a rate limit applies to every endpoint);</li>
          <li>circumvent security features, bug bounty scope, or fraud controls;</li>
          <li>upload malware, exploit code, or content that infringes intellectual property;</li>
          <li>resell, rent, or sublicense access to the Service without our written consent.</li>
        </ul>
        <p className="mt-3">
          Violations can result in immediate suspension, permanent ban, and (where applicable) referral to law
          enforcement.
        </p>
      </>
    ),
  },
  {
    id: 'shop-obligations',
    icon: Gavel,
    title: '9. If You Are a Shop (Partner Terms)',
    body: (
      <>
        <p>
          Shops onboarding through <Link href="/auth/signup" className="underline">overline.in</Link> or{' '}
          <a href="https://shop.overline.in" target="_blank" rel="noreferrer" className="underline">
            shop.overline.in
          </a>{' '}
          additionally agree to:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>operate as a legally-registered business with all applicable licenses, GST, and insurance in force;</li>
          <li>honour confirmed bookings and disclose their cancellation policy truthfully;</li>
          <li>not solicit off-platform payments to avoid platform fees;</li>
          <li>
            protect customer data received via Overline, use it only to fulfil the booking, and comply with the
            Digital Personal Data Protection Act, 2023;
          </li>
          <li>pay platform fees and commissions as agreed in the Partner Agreement.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ip',
    icon: FileText,
    title: '10. Intellectual Property',
    body: (
      <p>
        The Overline name, logo, product interface, code, and underlying technology are owned by Overline and protected
        under Indian and international intellectual-property laws. Nothing in these Terms transfers those rights to you.
        Shops retain all rights to their brand assets and listings.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    icon: ShieldAlert,
    title: '11. Disclaimers',
    body: (
      <>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We do not warrant that the Service
          will be uninterrupted, error-free, or free of harmful components. Recommendations, ratings, and estimated wait
          times are informational and may vary at the Shop.
        </p>
        <p className="mt-3">
          Services performed at a Shop are delivered by that Shop alone. Overline is not liable for the Shop&rsquo;s
          acts, omissions, or the quality of a service rendered, except to the extent caused by our own gross negligence
          or wilful misconduct.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    icon: Scale,
    title: '12. Limitation of Liability',
    body: (
      <p>
        To the maximum extent permitted by law, Overline&rsquo;s total aggregate liability to you for any claim arising
        out of or relating to the Service will not exceed the greater of (a) the amount you paid to Overline in the
        three months preceding the claim or (b) &#8377; 5,000. We are not liable for indirect, consequential, incidental,
        or exemplary damages, including loss of profits or data.
      </p>
    ),
  },
  {
    id: 'indemnity',
    icon: Gavel,
    title: '13. Indemnity',
    body: (
      <p>
        You agree to indemnify and hold harmless Overline, its officers, employees, and partners from any claim, loss,
        or expense (including reasonable legal fees) arising from your use of the Service, your content, or your breach
        of these Terms or any applicable law.
      </p>
    ),
  },
  {
    id: 'termination',
    icon: UserX,
    title: '14. Suspension & Termination',
    body: (
      <p>
        You can close your account at any time from Profile &rarr; Settings. We may suspend or terminate accounts that
        violate these Terms, create legal or financial risk for Overline, or remain inactive for an extended period. On
        termination, your licence to the Service ends; sections that by their nature survive (for example payments,
        indemnity, liability, dispute resolution) remain in force.
      </p>
    ),
  },
  {
    id: 'governing-law',
    icon: Scale,
    title: '15. Governing Law & Dispute Resolution',
    body: (
      <>
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-laws principles. Any dispute will
          first be attempted to be resolved amicably within 30 days of written notice to{' '}
          <a href="mailto:legal@overline.in" className="underline">
            legal@overline.in
          </a>
          .
        </p>
        <p className="mt-3">
          Unresolved disputes will be referred to binding arbitration under the Arbitration and Conciliation Act, 1996,
          seated in Bengaluru, Karnataka, before a sole arbitrator appointed by mutual agreement. The courts in
          Bengaluru will have exclusive jurisdiction over any ancillary matters.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    icon: RefreshCw,
    title: '16. Changes to the Terms',
    body: (
      <p>
        We may update these Terms from time to time. Material changes will be announced in-app or by email at least 14
        days before they take effect. Continuing to use the Service after an update constitutes acceptance of the
        updated Terms.
      </p>
    ),
  },
  {
    id: 'contact',
    icon: Mail,
    title: '17. Contact',
    body: (
      <>
        <p>For any question about these Terms, contact us:</p>
        <div className="mt-3 p-4 rounded-2xl bg-surface-container-high border border-outline-variant/20">
          <p className="font-semibold">Overline Technologies</p>
          <p>
            Legal: <a href="mailto:legal@overline.in" className="underline">legal@overline.in</a>
          </p>
          <p>
            Support: <a href="mailto:support@overline.in" className="underline">support@overline.in</a>
          </p>
          <p>
            Privacy: <a href="mailto:privacy@overline.in" className="underline">privacy@overline.in</a>
          </p>
        </div>
      </>
    ),
  },
];

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-surface">
      <SeoHead
        title="Terms of Service"
        description="The rules that govern how you and Overline use the booking platform, payments, wallet, reviews, and partner tools."
        canonical="/terms"
      />

      {/* Hero */}
      <section className="pt-24 pb-16 px-6 lg:px-8 bg-inverse-surface text-inverse-on-surface rounded-b-4xl md:rounded-b-5xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-secondary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-fixed/20 text-secondary-fixed mb-6 border border-secondary-fixed/30"
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Agreement</span>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-6">
            Terms of <br />
            <span className="text-inverse-on-surface/40">Service</span>
          </h1>
          <p className="text-lg md:text-xl text-inverse-on-surface/60 max-w-2xl leading-relaxed">
            The framework for using Overline as a customer or partner Shop. Written to be read &mdash; not skimmed past.
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

      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">
          <nav
            aria-label="Table of contents"
            className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/10"
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Contents</h2>
            <ol className="list-decimal pl-5 space-y-1 text-on-surface-variant columns-1 md:columns-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="hover:text-primary transition-colors">
                    {s.title.replace(/^\d+\.\s*/, '')}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {sections.map((s, i) => (
            <motion.article
              key={s.id}
              id={s.id}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
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

          <div className="p-10 rounded-4xl bg-inverse-surface text-inverse-on-surface flex flex-col items-center text-center gap-6 relative overflow-hidden">
            <Scale className="w-16 h-16 text-primary/40 absolute top-4 right-4" />
            <div className="relative z-10 max-w-lg">
              <h2 className="text-3xl font-black mb-3">Questions about these Terms?</h2>
              <p className="text-inverse-on-surface/60 mb-6">
                Email{' '}
                <a className="underline" href="mailto:legal@overline.in">
                  legal@overline.in
                </a>{' '}
                and we&rsquo;ll get back to you within two business days.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/privacy">
                  <Button
                    variant="ghost"
                    className="rounded-2xl px-8 py-3 font-black border border-white/20 text-inverse-on-surface"
                  >
                    Read Privacy Policy
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="rounded-2xl px-10 py-3 font-black bg-primary text-white shadow-button hover:shadow-button-hover active:scale-95 transition-all">
                    I agree &mdash; let&rsquo;s go
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
