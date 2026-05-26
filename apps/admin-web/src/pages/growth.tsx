import React from 'react';
import Head from 'next/head';
import { Card } from '@/components/ui';
import { MessageCircle, HelpCircle, CheckCircle2, Copy, Rocket, ExternalLink, Zap } from 'lucide-react';
import { useShopSettings } from '@/hooks/useAdmin';

export default function GrowthHubPage() {
  const { data: shop, isLoading } = useShopSettings();
  
  const shopUrl = shop?.slug ? `https://overline.app/shops/${shop.slug}` : 'https://overline.app';
  
  const englishTemplate = `Hi! To book your appointment quickly, tap here: ${shopUrl}\nChoose your time and confirm in 1 minute.`;
  
  const hindiTemplate = `Namaste! Appointment book karne ke liye yahan click karein: ${shopUrl}\nApna time choose karke 1 minute mein booking confirm karein.`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('WhatsApp template copied to clipboard!');
  };

  return (
    <>
      <Head>
        <title>Growth Hub | Overline</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Rocket className="w-8 h-8 text-primary" /> Growth Hub
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Marketing tools and resources to help you scale your business.</p>
        </div>

        {/* WhatsApp Integration */}
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#25D366]/10 text-[#25D366] rounded-2xl">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">WhatsApp Business Integration</h2>
              <p className="text-sm text-gray-500">Automate your bookings when you miss a call or get a message.</p>
            </div>
          </div>

          <Card className="p-0 overflow-hidden shadow-sm border-gray-200/60">
            <div className="grid md:grid-cols-2">
              <div className="p-6 md:p-8 bg-gray-50/50 border-r border-gray-100">
                <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> How to Setup
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</span>
                    <p className="text-sm text-gray-600">Download <a href="https://business.whatsapp.com/" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">WhatsApp Business</a> from the App Store or Play Store.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</span>
                    <p className="text-sm text-gray-600">Go to <strong>Settings {'>'} Business Tools {'>'} Away Message</strong> (or Greeting Message).</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</span>
                    <p className="text-sm text-gray-600">Turn it on, paste the template message from the right, and save.</p>
                  </li>
                </ol>
                <div className="mt-6 p-4 bg-[#25D366]/10 rounded-2xl border border-[#25D366]/20">
                  <p className="text-xs text-[#1DA851] font-bold">
                    💡 Pro Tip: When a customer calls and you can't pick up, just decline and text them. The auto-reply will send them your booking link!
                  </p>
                </div>
              </div>

              <div className="p-6 md:p-8">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-100 h-40 rounded-2xl w-full"></div>
                ) : (
                  <div className="space-y-4">
                    {/* English Template */}
                    <div className="bg-white border border-gray-200 shadow-inner rounded-2xl p-4 relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#25D366] rounded-t-2xl opacity-80" />
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">English</span>
                        <button 
                          onClick={() => handleCopy(englishTemplate)}
                          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                      </div>
                      <textarea 
                        readOnly 
                        value={englishTemplate}
                        className="w-full h-20 resize-none bg-transparent text-sm text-gray-700 outline-none leading-relaxed"
                      />
                    </div>
                    
                    {/* Hindi Template */}
                    <div className="bg-white border border-gray-200 shadow-inner rounded-2xl p-4 relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#25D366] rounded-t-2xl opacity-80" />
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hindi (Hinglish)</span>
                        <button 
                          onClick={() => handleCopy(hindiTemplate)}
                          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                      </div>
                      <textarea 
                        readOnly 
                        value={hindiTemplate}
                        className="w-full h-20 resize-none bg-transparent text-sm text-gray-700 outline-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* FAQs for Shop Owners */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Frequently Asked Questions</h2>
              <p className="text-sm text-gray-500">Everything you need to know about partnering with Overline.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="p-6 shadow-sm border-gray-200/60 hover:border-indigo-200 transition-colors group">
              <h3 className="font-black text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> How exactly does it work in my shop?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed pl-7">
                Customers book their slots online using your unique link. You and your staff instantly see the booking on this dashboard (or the mobile app). You no longer need to manually write tokens or manage phone calls. Just check the app and serve the next customer!
              </p>
            </Card>

            <Card className="p-6 shadow-sm border-gray-200/60 hover:border-indigo-200 transition-colors group">
              <h3 className="font-black text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> How does Overline earn? Do you take extra charges?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed pl-7">
                We believe in transparent pricing. We grow when you grow. We do not place hidden charges on your customers. Depending on your region, we charge a flat monthly software fee or a tiny transparent platform fee at checkout. You keep 100% of your service price.
              </p>
            </Card>

            <Card className="p-6 shadow-sm border-gray-200/60 hover:border-indigo-200 transition-colors group">
              <h3 className="font-black text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> How will we get new customers?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed pl-7">
                Your shop is listed on the central Overline Explore page, which is actively marketed to users in your city. Additionally, by setting up the WhatsApp loop (above), you convert standard phone inquiries into loyal digital customers who will book you again and again via the app.
              </p>
            </Card>

            <Card className="p-6 shadow-sm border-gray-200/60 hover:border-indigo-200 transition-colors group">
              <h3 className="font-black text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Can we take extra charges during peak hours or night?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed pl-7">
                Yes! You have full control over your pricing. You can create specific "Peak Hour" or "Night Booking" services with higher pricing in the Services tab. Your customers will see the premium pricing upfront, avoiding any awkward conversations at the register.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
