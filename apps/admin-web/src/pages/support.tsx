import Head from 'next/head';
import Link from 'next/link';
import { ChevronLeft, Mail, MessageSquare, Phone, Clock, HelpCircle, BookOpen, AlertTriangle } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'How do I update my shop\'s working hours?',
    answer: 'Go to Shop Profile → Working Hours from the sidebar. You can set individual hours for each day of the week, including marking days as off.',
  },
  {
    question: 'A customer wants to cancel — what should I do?',
    answer: 'Navigate to Bookings, find the appointment, and click "Cancel". The customer will be notified automatically. Cancellation within the shop\'s policy window triggers a full refund.',
  },
  {
    question: 'How do I add or remove staff members?',
    answer: 'Go to Staff Management from the sidebar. Click "Add Staff" to invite a new member via phone number. To remove, open their profile and select "Remove from Shop".',
  },
  {
    question: 'When do I receive my payouts?',
    answer: 'Payouts are processed weekly on Wednesdays for the previous week\'s confirmed bookings. Settlement typically takes 1-2 business days via Razorpay.',
  },
  {
    question: 'How do I handle a no-show?',
    answer: 'Open the booking from your Appointments page and mark it as "No-Show". This updates the customer\'s trust score and helps our platform maintain quality.',
  },
  {
    question: 'Can I temporarily close my shop?',
    answer: 'Yes. Go to Shop Profile → Settings and toggle "Temporarily Closed". This hides your shop from search results without losing your data.',
  },
];

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get a detailed response within 24 hours',
    action: 'support@overline.in',
    href: 'mailto:support@overline.in',
  },
  {
    icon: Phone,
    title: 'Phone Support',
    description: 'Mon–Sat, 10 AM – 7 PM IST',
    action: '+91 7024 860 XXX',
    href: 'tel:+917024860000',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp',
    description: 'Quick questions and screenshots',
    action: 'Chat on WhatsApp',
    href: 'https://wa.me/917024860000',
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen ovl-admin-bg">
      <Head>
        <title>Support — Overline Partner Portal</title>
        <meta name="description" content="Get help with the Overline Partner Portal. Contact support, browse FAQs, and find guides for managing your shop." />
      </Head>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors mb-8">
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        {/* Header */}
        <div className="card-m3 p-8 md:p-12 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-button">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest text-primary uppercase">Help Center</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface mb-3">Support</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            Need help managing your shop? Browse our FAQs below or reach out — our team typically responds within a few hours.
          </p>
        </div>

        {/* Contact Channels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {CONTACT_CHANNELS.map((channel) => (
            <a
              key={channel.title}
              href={channel.href}
              target={channel.href.startsWith('http') ? '_blank' : undefined}
              rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="card-m3 p-6 hover:shadow-card-hover transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <channel.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-bold text-on-surface mb-1">{channel.title}</h3>
              <p className="text-xs text-on-surface-variant mb-3">{channel.description}</p>
              <span className="text-sm font-bold text-primary">{channel.action}</span>
            </a>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="card-m3 p-8 md:p-12 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-black tracking-tight text-on-surface">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-6">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-primary/20 transition-colors">
                <h3 className="font-bold text-on-surface mb-2 flex items-start gap-3">
                  <span className="text-primary font-black text-sm mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  {item.question}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed pl-8">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent Issue Banner */}
        <div className="p-6 rounded-2xl bg-error-container/20 border border-error/20 flex items-start gap-4 mb-8">
          <AlertTriangle className="w-6 h-6 text-error flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-on-surface mb-1">Reporting an urgent issue?</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              If you're experiencing a critical problem (payment failures, account lockout, or data discrepancy), email
              {' '}<a href="mailto:support@overline.in" className="font-bold text-primary hover:underline">support@overline.in</a>{' '}
              with subject line <strong>"URGENT"</strong> and we'll prioritise your case.
            </p>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="card-m3 p-6 flex items-center gap-4">
          <Clock className="w-5 h-5 text-outline" />
          <div>
            <p className="text-sm font-semibold text-on-surface">Support Hours</p>
            <p className="text-xs text-on-surface-variant">Monday – Saturday, 10:00 AM – 7:00 PM IST. Emails received outside hours are answered the next business day.</p>
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-8">
          © {new Date().getFullYear()} Overline · <Link href="/privacy" className="hover:text-primary">Privacy</Link> · <Link href="/terms" className="hover:text-primary">Terms</Link>
        </p>
      </div>
    </div>
  );
}
