import React from 'react';
import Head from 'next/head';
import { 
  MessageSquare, 
  Settings, 
  ShieldCheck, 
  Zap, 
  ExternalLink,
  Smartphone,
  Server,
  FileText,
  Copy,
  CheckCircle2,
  Download,
  MessageCircle,
  Clock,
  Phone,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Monitor,
  AlertTriangle,
} from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useShopSettings } from '@/hooks/useAdmin';
import { useRecentActivity } from '@/hooks';

export default function WhatsAppSettingsPage() {
  const { addToast } = useToast();
  const { data: shop, isLoading: shopLoading } = useShopSettings();
  const { data: recentActivity = [], isLoading: activityLoading } = useRecentActivity();
  const [isEnabled, setIsEnabled] = React.useState(true);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const shopName = (shop as any)?.name || 'Your Shop';
  const shopSlug = (shop as any)?.slug || 'your-shop';
  const bookingUrl = `https://overline.in/shops/${shopSlug}`;

  const templates = [
    { name: 'otp_verification', status: 'Approved', language: 'en_US', category: 'AUTHENTICATION' },
    { name: 'booking_confirmation', status: 'Approved', language: 'en_US', category: 'UTILITY' },
    { name: 'appointment_reminder', status: 'Approved', language: 'en_US', category: 'UTILITY' },
    { name: 'payment_success', status: 'Approved', language: 'en_US', category: 'UTILITY' },
  ];

  // --- Copyable WhatsApp templates ---
  const awayMessageEn = `Hello! 👋 Thank you for contacting ${shopName}.\n\nWe are currently busy serving clients. To book your appointment or check live wait time instantly, click here:\n🔗 ${bookingUrl}\n\n⚡ No extra charges. Pay directly at the shop.\n📲 Track your queue live on the Overline app!`;

  const awayMessageHi = `Namaste! 🙏 ${shopName} mein call karne ke liye dhanyavaad.\n\nAbhi hum busy hain. Apna appointment turant book karne ke liye yahan click karein:\n🔗 ${bookingUrl}\n\n💰 Koi extra charge nahi. Shop par seedha pay karein.\n📲 Overline app se apni baari live track karein!`;

  const quickReplyBook = `Apna slot directly book karein:\n🔗 ${bookingUrl}\n\nService choose karein, time select karein, done! ✅\nSirf shop par pay karein — zero platform fees.`;

  const missedCallReply = `Hey! We missed your call. 📞\n\nDon't wait in line! Book your slot instantly here:\n🔗 ${bookingUrl}\n\n⚡ No extra charges. Pay at the shop.\n📲 Get live queue updates on the Overline app.`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      addToast({
        type: 'success',
        title: 'Copied!',
        message: 'Template copied to clipboard. Paste it in your WhatsApp Business settings.',
      });
      setTimeout(() => setCopiedId(null), 3000);
    });
  };

  const handleToggle = () => {
    setIsEnabled(!isEnabled);
    addToast({
      type: 'success',
      title: !isEnabled ? 'WhatsApp Messaging Enabled' : 'WhatsApp Messaging Disabled',
      message: !isEnabled ? 'Customers will now receive OTPs via WhatsApp.' : 'System will fallback to SMS for critical alerts.'
    });
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button 
      onClick={() => handleCopy(text, id)}
      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 ${
        copiedId === id 
          ? 'bg-emerald-100 text-emerald-700' 
          : 'text-primary hover:bg-primary/10'
      }`}
    >
      {copiedId === id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copiedId === id ? 'Copied!' : 'Copy'}
    </button>
  );

  return (
    <>
      <Head>
        <title>WhatsApp Business Setup — Overline</title>
      </Head>

      <div className="space-y-8 max-w-5xl pb-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="label-m3">Shop Owner Tools</span>
            <span className="badge-ai">Growth</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">WhatsApp Business Setup</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Turn missed calls into instant bookings. Set up your WhatsApp auto-replies and start acquiring customers in 2 minutes.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1: WhatsApp Business Onboarding Kit
            ═══════════════════════════════════════════════════════════════ */}
        <div className="card-m3 overflow-hidden border-2 border-[#25D366]/30">
          {/* Green header banner */}
          <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black">WhatsApp Business Onboarding Kit</h2>
                <p className="text-white/80 text-sm">2-minute setup • Zero cost • Instant results</p>
              </div>
            </div>
            <p className="text-white/90 text-sm leading-relaxed mt-3">
              Most of your customers call you to book appointments. When you're busy, you miss calls — and lose customers.
              With this kit, every missed call automatically sends your booking link via WhatsApp. The customer books online,
              and <strong>you see it instantly in your Overline dashboard</strong>.
            </p>
          </div>

          {/* Setup Steps */}
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Setup in 3 Easy Steps
            </h3>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4 p-4 bg-surface-container-low rounded-2xl">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                  <span className="text-[#25D366] font-black text-lg">1</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-on-surface mb-1">Download WhatsApp Business</h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Convert your personal shop number to a business profile. Download from 
                    <a href="https://business.whatsapp.com/" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline ml-1">
                      WhatsApp Business <ExternalLink className="w-3 h-3 inline" />
                    </a>
                    . It's free and works alongside your personal WhatsApp.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 p-4 bg-surface-container-low rounded-2xl">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                  <span className="text-[#25D366] font-black text-lg">2</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-on-surface mb-1">Set Up Away Message / Auto-Reply</h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    Go to <strong>Settings → Business Tools → Away Message</strong>. Turn it on, set the schedule 
                    (e.g., "Always send" or "Outside working hours"), then paste one of the templates below as your message.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-800 font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Pro Tip
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      When a customer calls and you can't pick up, just decline the call. WhatsApp Business will 
                      automatically send them your booking link! They book online, you see it on your dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 p-4 bg-surface-container-low rounded-2xl">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                  <span className="text-[#25D366] font-black text-lg">3</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-on-surface mb-1">Set Up Quick Replies (<code className="text-xs bg-surface-container px-1 py-0.5 rounded">/book</code>)</h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Go to <strong>Settings → Business Tools → Quick Replies</strong>. Create a shortcut called 
                    <code className="text-xs bg-surface-container px-1 py-0.5 rounded mx-1">/book</code>. When a customer messages asking for availability,
                    just type <code className="text-xs bg-surface-container px-1 py-0.5 rounded">/book</code> to instantly send them your booking link.
                  </p>
                </div>
              </div>
            </div>

            {/* Your Booking Link */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Your Shop's Booking Link</p>
              <div className="flex items-center gap-2">
                <input 
                  readOnly 
                  value={bookingUrl}
                  className="input-m3 flex-1 font-mono text-sm !bg-white/80 !border-primary/20"
                />
                <button 
                  onClick={() => handleCopy(bookingUrl, 'booking-url')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    copiedId === 'booking-url'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {copiedId === 'booking-url' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedId === 'booking-url' ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                Share this link anywhere — WhatsApp, Instagram bio, Google Business, printed QR codes, or table tents at your shop counter.
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2: Copyable WhatsApp Templates
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Ready-to-Use Templates
          </h2>
          <p className="text-sm text-on-surface-variant">
            Copy any template below and paste it directly into your WhatsApp Business settings. Your shop name and booking link are pre-filled.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Away Message - English */}
            <div className="card-m3 p-0 overflow-hidden">
              <div className="bg-[#25D366] h-1" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#25D366]" />
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Away Message — English</span>
                  </div>
                  <CopyButton text={awayMessageEn} id="away-en" />
                </div>
                <pre className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap font-sans bg-surface-container-low rounded-xl p-4 border border-outline-variant/10">
                  {awayMessageEn}
                </pre>
              </div>
            </div>

            {/* Away Message - Hindi */}
            <div className="card-m3 p-0 overflow-hidden">
              <div className="bg-[#25D366] h-1" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#25D366]" />
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Away Message — Hindi (Hinglish)</span>
                  </div>
                  <CopyButton text={awayMessageHi} id="away-hi" />
                </div>
                <pre className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap font-sans bg-surface-container-low rounded-xl p-4 border border-outline-variant/10">
                  {awayMessageHi}
                </pre>
              </div>
            </div>

            {/* Missed Call Reply */}
            <div className="card-m3 p-0 overflow-hidden">
              <div className="bg-amber-400 h-1" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Missed Call Auto-Reply</span>
                  </div>
                  <CopyButton text={missedCallReply} id="missed-call" />
                </div>
                <pre className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap font-sans bg-surface-container-low rounded-xl p-4 border border-outline-variant/10">
                  {missedCallReply}
                </pre>
              </div>
            </div>

            {/* Quick Reply /book */}
            <div className="card-m3 p-0 overflow-hidden">
              <div className="bg-primary h-1" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Quick Reply — <code>/book</code></span>
                  </div>
                  <CopyButton text={quickReplyBook} id="quick-book" />
                </div>
                <pre className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap font-sans bg-surface-container-low rounded-xl p-4 border border-outline-variant/10">
                  {quickReplyBook}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3: Important — Bookings Managed on Overline
            ═══════════════════════════════════════════════════════════════ */}
        <div className="card-m3 p-0 overflow-hidden border-2 border-primary/20">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Monitor className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
                  All Bookings Are Managed Inside Overline
                  <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">Important</span>
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mt-2">
                  WhatsApp is only used to <strong>send your booking link to customers</strong>. Once they click and book, 
                  everything is managed inside the Overline ecosystem:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div className="flex items-start gap-2.5 bg-white/60 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Instant Dashboard Updates</p>
                      <p className="text-xs text-on-surface-variant">New bookings appear instantly on your Overline admin dashboard and mobile app.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-white/60 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Queue Management</p>
                      <p className="text-xs text-on-surface-variant">Start services, mark complete, manage your waitlist — all from this dashboard.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-white/60 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Real-Time Customer Alerts</p>
                      <p className="text-xs text-on-surface-variant">Customers receive live queue updates, confirmations, and reminders via WhatsApp + app notifications.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-white/60 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Zero Commission</p>
                      <p className="text-xs text-on-surface-variant">Keep 100% of your service earnings. Customers pay directly at your shop via cash or UPI.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Flow diagram */}
          <div className="p-6 border-t border-outline-variant/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-4">How the Booking Flow Works</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-3 py-1.5 bg-amber-50 text-amber-700 font-bold rounded-lg border border-amber-200">📞 Customer Calls</span>
              <ArrowRight className="w-4 h-4 text-outline" />
              <span className="px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg border border-red-200">❌ You're Busy</span>
              <ArrowRight className="w-4 h-4 text-outline" />
              <span className="px-3 py-1.5 bg-[#25D366]/10 text-[#128C7E] font-bold rounded-lg border border-[#25D366]/30">💬 WhatsApp Auto-Reply</span>
              <ArrowRight className="w-4 h-4 text-outline" />
              <span className="px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-lg border border-primary/20">🔗 Customer Clicks Link</span>
              <ArrowRight className="w-4 h-4 text-outline" />
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200">✅ Booked on Overline</span>
              <ArrowRight className="w-4 h-4 text-outline" />
              <span className="px-3 py-1.5 bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-200">📊 You See It Here</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 4: Cloud API Configuration (existing)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" /> Platform: WhatsApp Cloud API
          </h2>
          <p className="text-sm text-on-surface-variant">
            Enterprise-grade API configuration for automated OTPs, booking confirmations, and queue reminders.
          </p>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-m3 p-5 flex items-center gap-4 border-l-4 border-l-primary">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">API Status</p>
              <p className="text-lg font-black text-on-surface">Connected</p>
            </div>
          </div>
          <div className="card-m3 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Phone ID</p>
              <p className="text-sm font-bold text-on-surface font-mono">Configured</p>
            </div>
          </div>
          <div className="card-m3 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Compliance</p>
              <p className="text-sm font-bold text-on-surface">Verified Account</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Config */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-m3 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" /> Integration Settings
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-on-surface-variant">Active</span>
                  <button 
                    onClick={handleToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label-m3">Business Account ID</label>
                  <div className="flex gap-2 mt-1">
                    <input readOnly value="Connected via Overline" className="input-m3 flex-1 font-mono text-xs" />
                    <Button variant="tonal" className="px-3"><ExternalLink className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div>
                  <label className="label-m3">Meta App ID</label>
                  <input readOnly value="Managed by Overline Platform" className="input-m3 mt-1 font-mono text-xs" />
                </div>
                <div className="pt-4 border-t border-outline-variant/10">
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Overline uses the WhatsApp Cloud API to deliver OTPs, booking confirmations, and reminders. 
                    Manage your templates and phone numbers in the <a href="https://developers.facebook.com" target="_blank" className="text-primary font-bold hover:underline">Meta Developer Portal</a>.
                  </p>
                </div>
              </div>
            </div>

            {/* Templates */}
            <div className="card-m3 overflow-hidden">
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Message Templates
                </h2>
                <span className="text-[10px] font-black uppercase tracking-tighter bg-surface-container-high px-2 py-1 rounded">Syncing Enabled</span>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {templates.map((tpl) => (
                  <div key={tpl.name} className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-outline" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{tpl.name}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">{tpl.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-on-surface-variant">{tpl.language}</span>
                      <span className="badge-ai !text-primary bg-primary/5">Approved</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="space-y-6">
            <div className="card-m3 p-6 bg-surface-container-low/50">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" /> Real-time Activity
              </h2>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="ml-2 text-xs text-on-surface-variant">Loading activity...</span>
                </div>
              ) : (recentActivity as any[]).length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 text-outline/40 mx-auto mb-2" />
                  <p className="text-sm font-bold text-on-surface-variant">No WhatsApp activity yet</p>
                  <p className="text-xs text-outline mt-1">
                    Activity will appear here when customers receive OTPs and booking confirmations.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(recentActivity as any[]).slice(0, 5).map((log: any, i: number) => (
                    <div key={log.id || i} className="flex gap-3 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-on-surface">{log.title || log.type || 'Notification'}</span>
                          <span className="text-[10px] text-outline">
                            {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-on-surface-variant">{log.message || log.body || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-m3 p-6 bg-gradient-to-br from-primary/5 to-transparent">
              <h3 className="text-sm font-black text-on-surface mb-2 uppercase tracking-tight">Review Guidance</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                This integration utilizes webhooks for <strong>manage_events</strong> to ensure message reliability and 
                <strong> business_management</strong> to synchronize shop profiles with WhatsApp metadata.
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 5: FAQs for Shop Owners
            ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4 mt-8">
          <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            <div className="card-m3 p-5 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-on-surface flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Do I need to manage bookings on WhatsApp?
              </h4>
              <p className="text-sm text-on-surface-variant leading-relaxed pl-6">
                <strong>No.</strong> WhatsApp only sends the booking link. Once a customer books, everything is managed inside 
                your Overline dashboard. You'll see bookings, manage your queue, start/complete services, and track earnings — 
                all from this app. WhatsApp is just the bridge to get customers here.
              </p>
            </div>

            <div className="card-m3 p-5 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-on-surface flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> What if I use simple WhatsApp (not Business)?
              </h4>
              <p className="text-sm text-on-surface-variant leading-relaxed pl-6">
                You can still share your booking link manually. Just copy any template above and send it to customers when they 
                message you. But we strongly recommend upgrading to WhatsApp Business (free!) to enable automatic replies and 
                save time during busy hours.
              </p>
            </div>

            <div className="card-m3 p-5 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-on-surface flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Does it cost me anything?
              </h4>
              <p className="text-sm text-on-surface-variant leading-relaxed pl-6">
                <strong>Zero.</strong> The WhatsApp Business app is free. Overline charges no commission on bookings. 
                Your customers pay you directly at the shop via cash or UPI. You keep 100% of your earnings.
              </p>
            </div>

            <div className="card-m3 p-5 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-on-surface flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Will the customer need to download the Overline app?
              </h4>
              <p className="text-sm text-on-surface-variant leading-relaxed pl-6">
                Not required. Your booking link opens directly in the browser. Customers can book without downloading anything. 
                However, if they download the Overline app, they get live queue position tracking, push notifications, and 
                a better experience for repeat bookings.
              </p>
            </div>

            <div className="card-m3 p-5 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-on-surface flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> What happens if two customers book the same time?
              </h4>
              <p className="text-sm text-on-surface-variant leading-relaxed pl-6">
                Overline automatically prevents double-bookings. Once a slot is taken, it's no longer available for others. 
                If a staff member is busy, the system shows the next available slot. No conflicts, no manual juggling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
