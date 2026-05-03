import Head from 'next/head';
import Link from 'next/link';
import { Shield, ChevronLeft } from 'lucide-react';

const SECTIONS: Array<{ id: string; title: string; body: string[] }> = [
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    body: [
      'When you register a partner account, we collect your business name, owner name, email, phone number, GST/PAN where applicable, address, working hours, and the catalogue of services and staff you publish.',
      'We collect operational data generated through the platform — appointments, walk-ins, queue events, payment receipts, service completion timestamps and ratings — to power the live queue, reports and reconciliation features.',
      'We collect device and usage information (IP address, browser, pages visited, errors) for security, fraud prevention and product improvement.',
    ],
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Information',
    body: [
      'To operate the booking and queue platform, settle payouts, send transactional notifications (SMS, email, push) to you and your customers, and provide customer support.',
      'To enforce our Terms of Service, detect fraud and abuse, and meet our legal obligations under Indian law.',
      'To improve and personalise the product — for example, ranking your shop in customer search results based on rating, response time and completion rate.',
    ],
  },
  {
    id: 'sharing',
    title: 'How We Share Information',
    body: [
      'With customers booking your services — your shop name, address, phone number, working hours, services and staff are public on overline.in.',
      'With payment processors (Razorpay) and SMS/email providers strictly for transactional purposes.',
      'With law enforcement when compelled by valid legal process.',
      'We do not sell your data or your customers\' data to third parties.',
    ],
  },
  {
    id: 'security',
    title: 'Security & Data Retention',
    body: [
      'We use HTTPS in transit, encrypted storage at rest, and role-based access controls. Payment card data is never stored on our servers — it is tokenised by Razorpay.',
      'Booking records and financial receipts are retained for at least 7 years to comply with Indian tax law. Account profile data is retained while your account is active and for 12 months after closure.',
    ],
  },
  {
    id: 'rights',
    title: 'Your Rights',
    body: [
      'You may export your shop data, edit your profile, or request account deletion from Settings → Account, or by writing to support@overline.in. Deletion requests are processed within 30 days subject to legal retention requirements.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    body: [
      'Questions about this Privacy Policy: support@overline.in. Postal address available on request.',
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen ovl-admin-bg">
      <Head>
        <title>Privacy Policy — Overline Partner Portal</title>
        <meta name="description" content="How Overline collects, uses, shares and protects partner and customer data on the Overline booking platform." />
      </Head>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors mb-8">
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="card-m3 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-button">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest text-primary uppercase">Legal</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface mb-3">Privacy Policy</h1>
          <p className="text-on-surface-variant">Last updated {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>

          <hr className="my-8 border-outline-variant" />

          {/* Table of contents */}
          <nav aria-label="Table of contents" className="mb-10 p-5 rounded-2xl bg-surface-container-low border border-outline-variant">
            <p className="text-xs font-bold tracking-widest text-on-surface-variant uppercase mb-3">On this page</p>
            <ol className="space-y-1.5 text-sm">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-primary hover:underline font-medium">
                    {String(i + 1).padStart(2, '0')}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-10 text-on-surface-variant leading-relaxed">
            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-xl font-bold tracking-tight text-on-surface mb-3">
                  {String(i + 1).padStart(2, '0')}. {s.title}
                </h2>
                <div className="space-y-3">
                  {s.body.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-8">
          © {new Date().getFullYear()} Overline · <Link href="/terms" className="hover:text-primary">Terms</Link> · <Link href="/support" className="hover:text-primary">Support</Link>
        </p>
      </div>
    </div>
  );
}
