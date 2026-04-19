import React from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText, Globe } from 'lucide-react';
import { Button } from '@/components/ui';
import Link from 'next/link';

const PrivacyPolicy = () => {
  const sections = [
    {
      title: 'Information We Collect',
      icon: Eye,
      content: 'We collect information you provide directly to us when you create an account, book a service, or communicate with us. This includes your name, email, phone number, and location data if you enable it for finding nearby shops.'
    },
    {
      title: 'How We Use Your Information',
      icon: Globe,
      content: 'Your information is used to facilitate bookings, process payments, and provide you with a personalized experience. We also use it to improve our platform and notify you about booking status or relevant updates.'
    },
    {
      title: 'Data Security',
      icon: Shield,
      content: 'We implement industry-standard security measures to protect your data. All sensitive communications are encrypted, and we do not store full credit card details on our servers.'
    },
    {
      title: 'Third Party Services',
      icon: Lock,
      content: 'We may share information with trusted third-party service providers (like payment processors or cloud hosting) strictly to perform their services for us. We never sell your personal data to advertisers.'
    }
  ];

  return (
    <div className="min-h-screen bg-surface">
      <Head>
        <title>Privacy Policy | Overline</title>
        <meta name="description" content="Privacy Policy for Overline - Learn how we protect and manage your data." />
      </Head>

      {/* Hero Header */}
      <section className="pt-24 pb-16 px-6 lg:px-8 bg-inverse-surface text-inverse-on-surface rounded-b-4xl md:rounded-b-5xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
         <div className="max-w-4xl mx-auto relative z-10 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-fixed/20 text-primary-fixed mb-6 border border-primary-fixed/30"
            >
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Legal Document</span>
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-8">
              Privacy <br/>
              <span className="text-inverse-on-surface/40">Policy</span>
            </h1>
            <p className="text-xl text-inverse-on-surface/60 max-w-2xl leading-relaxed">
              Transparent management of your digital identity. We value your trust and prioritize your data security above all else.
            </p>
         </div>
      </section>

      {/* Content */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="prose prose-lg max-w-none text-on-surface-variant leading-relaxed">
            <p className="text-lg font-medium text-on-surface">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p>Welcome to Overline. This Privacy Policy explains how we collect, use, and share information when you use our platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/20 hover:bg-surface-container-high transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                  <section.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-on-surface mb-4 tracking-tight">{section.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{section.content}</p>
              </motion.div>
            ))}
          </div>

          <div className="p-10 rounded-4xl bg-primary/5 border border-primary/20 space-y-6">
            <h2 className="text-2xl font-black text-on-surface tracking-tight">Your Rights</h2>
            <p className="text-on-surface-variant leading-relaxed">
              You have the right to access, update, or delete your personal information at any time. You can manage your data visibility through your profile settings or by contacting our support team.
            </p>
            <div className="flex gap-4">
               <Link href="/profile">
                  <Button className="rounded-xl px-6 py-3 font-bold bg-primary text-white">Manage Settings</Button>
               </Link>
               <Button variant="ghost" className="rounded-xl px-6 py-3 font-bold">Contact Support</Button>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-on-surface tracking-tight">Google User Data Disclosure</h2>
            <div className="p-8 rounded-3xl bg-surface-container-low border border-outline-variant/10">
              <p className="text-on-surface-variant leading-relaxed">
                Overline accesses your Google profile name and email address to create your account and send booking confirmations. We do not share this data with third parties or use it for marketing without your explicit consent.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
