import Head from 'next/head';
import Link from 'next/link';
import { FileText, ChevronLeft } from 'lucide-react';

const SECTIONS: Array<{ id: string; title: string; body: string[] }> = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    body: [
      'By registering for or using the Overline Partner Portal ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.',
      'Overline reserves the right to update these Terms at any time. Continued use after changes constitutes acceptance of the revised Terms.',
    ],
  },
  {
    id: 'partner-obligations',
    title: 'Partner Obligations',
    body: [
      'You must provide accurate and up-to-date information about your business, including but not limited to: business name, address, services offered, pricing, staff details, and working hours.',
      'You are responsible for maintaining the accuracy of your service catalogue, pricing, and staff availability on the Platform at all times.',
      'You agree to honour all confirmed bookings made through the Platform and to manage cancellations in accordance with your published cancellation policy.',
    ],
  },
  {
    id: 'accounts',
    title: 'User Accounts',
    body: [
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
      'You must immediately notify Overline of any unauthorised use of your account. Overline is not liable for any loss or damage resulting from unauthorised access.',
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Commissions',
    body: [
      'Overline processes customer payments through Razorpay. You agree to the applicable payment processing terms and fees.',
      'Platform commission rates are communicated during onboarding and may be updated with 30 days advance notice.',
      'Payouts are processed as per the agreed schedule. Overline reserves the right to withhold payouts in cases of suspected fraud or policy violations.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    body: [
      'You agree not to use the Platform for any unlawful purpose, to impersonate any person or entity, or to interfere with the operation of the Platform.',
      'Publishing misleading information, fake reviews, or manipulating queue/booking data is strictly prohibited and may result in account suspension.',
    ],
  },
  {
    id: 'ip',
    title: 'Intellectual Property',
    body: [
      'All Overline trademarks, logos, and Platform content are the property of Overline. You may not use them without prior written consent.',
      'You retain ownership of your business content (photos, descriptions, branding) uploaded to the Platform. By uploading, you grant Overline a non-exclusive licence to display this content on the Platform.',
    ],
  },
  {
    id: 'limitation',
    title: 'Limitation of Liability',
    body: [
      'Overline shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Platform.',
      'Overline does not guarantee any specific booking volume, revenue, or business outcomes from using the Platform.',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    body: [
      'Either party may terminate the agreement with 30 days written notice. Overline may suspend or terminate accounts immediately for policy violations.',
      'Upon termination, outstanding payouts will be settled within 30 business days, subject to any pending disputes.',
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    body: [
      'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bhopal, Madhya Pradesh.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    body: [
      'For questions about these Terms: support@overline.in. Postal address available on request.',
    ],
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen ovl-admin-bg">
      <Head>
        <title>Terms of Service — Overline Partner Portal</title>
        <meta name="description" content="Terms of Service governing the use of the Overline Partner Portal for shop owners and staff." />
      </Head>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors mb-8">
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="card-m3 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-button">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest text-primary uppercase">Legal</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface mb-3">Terms of Service</h1>
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
          © {new Date().getFullYear()} Overline · <Link href="/privacy" className="hover:text-primary">Privacy</Link> · <Link href="/support" className="hover:text-primary">Support</Link>
        </p>
      </div>
    </div>
  );
}
