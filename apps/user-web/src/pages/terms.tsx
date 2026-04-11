import React from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Scale, CheckCircle, AlertCircle, FileText, Gavel } from 'lucide-react';
import { Button } from '@/components/ui';
import Link from 'next/link';

const TermsOfService = () => {
  const points = [
    {
      title: 'Platform Access',
      content: 'You must be at least 18 years old or under guardian supervision to use Overline. You are responsible for maintaining the confidentiality of your account credentials.'
    },
    {
      title: 'Booking Rules',
      content: 'Bookings are subject to shop availability. Shops reserve the right to decline service for behavioral reasons. Cancellations must adhere to the shop policy visible at checkout.'
    },
    {
      title: 'Acceptable Use',
      content: 'You agree not to misuse our platform for fraudulent bookings, harassment, or extraction of data through automated scripts or scraping tools.'
    },
    {
      title: 'Limitation of Liability',
      content: 'Overline is a marketplace platform. While we verify shops, we are not liable for the actual quality of service provided by individual providers.'
    }
  ];

  return (
    <div className="min-h-screen bg-surface">
      <Head>
        <title>Terms of Service | Overline</title>
        <meta name="description" content="Terms of Service for Overline - The rules and guidelines for using our platform." />
      </Head>

      {/* Hero Header */}
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
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-8">
              Terms of <br/>
              <span className="text-inverse-on-surface/40">Service</span>
            </h1>
            <p className="text-xl text-inverse-on-surface/60 max-w-2xl leading-relaxed">
              The framework of our partnership. Clear rules for a better booking experience for everyone on the platform.
            </p>
         </div>
      </section>

      {/* Content */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="prose prose-lg max-w-none text-on-surface-variant leading-relaxed mb-16">
            <div className="flex items-center gap-3 mb-4">
               <Gavel className="w-6 h-6 text-primary" />
               <p className="text-lg font-bold text-on-surface m-0">Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <p>By using Overline, you agree to these terms. Please read them carefully. These terms governing your access to and use of our platform, including any content, functionality, and services offered.</p>
          </div>

          <div className="space-y-6">
            {points.map((point, i) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-6 p-8 rounded-4xl bg-surface-container-low border border-outline-variant/5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="shrink-0 mt-1">
                   <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                      {i + 1}
                   </div>
                </div>
                <div>
                   <h3 className="text-2xl font-black text-on-surface mb-3 tracking-tight">{point.title}</h3>
                   <p className="text-on-surface-variant text-lg leading-relaxed">{point.content}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 p-10 rounded-4xl bg-inverse-surface text-inverse-on-surface flex flex-col items-center text-center gap-8 relative overflow-hidden">
             <Scale className="w-16 h-16 text-primary/40 absolute top-4 right-4" />
             <div className="relative z-10 max-w-lg">
                <h2 className="text-3xl font-black mb-4">Questions about our terms?</h2>
                <p className="text-inverse-on-surface/60 mb-8">
                   Our legal team and support agents are here to clarify any points of the agreement.
                </p>
                <Link href="/auth/signup">
                   <Button className="rounded-2xl px-12 py-4 font-black bg-primary text-white shadow-button hover:shadow-button-hover active:scale-95 transition-all">
                      I AGREE, LET'S GO
                   </Button>
                </Link>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
