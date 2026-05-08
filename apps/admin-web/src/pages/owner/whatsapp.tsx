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
  FileText
} from 'lucide-react';
import { Button, useToast } from '@/components/ui';

export default function WhatsAppSettingsPage() {
  const { addToast } = useToast();
  const [isEnabled, setIsEnabled] = React.useState(true);

  const templates = [
    { name: 'otp_verification', status: 'Approved', language: 'en_US', category: 'AUTHENTICATION' },
    { name: 'booking_confirmation', status: 'Approved', language: 'en_US', category: 'UTILITY' },
    { name: 'appointment_reminder', status: 'Approved', language: 'en_US', category: 'UTILITY' },
    { name: 'payment_success', status: 'Approved', language: 'en_US', category: 'UTILITY' },
  ];

  const handleToggle = () => {
    setIsEnabled(!isEnabled);
    addToast({
      type: 'success',
      title: !isEnabled ? 'WhatsApp Messaging Enabled' : 'WhatsApp Messaging Disabled',
      message: !isEnabled ? 'Customers will now receive OTPs via WhatsApp.' : 'System will fallback to SMS for critical alerts.'
    });
  };

  return (
    <>
      <Head>
        <title>WhatsApp Configuration — Overline</title>
      </Head>

      <div className="space-y-6 max-w-5xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="label-m3">Platform Administration</span>
            <span className="badge-ai">Enterprise</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">WhatsApp Cloud API</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Configure Meta WhatsApp Cloud API credentials and manage message templates for customer communication.
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
              <p className="text-sm font-bold text-on-surface">136550977892...</p>
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
                    <input readOnly value="1334428105239811" className="input-m3 flex-1 font-mono text-xs" />
                    <Button variant="tonal" className="px-3"><ExternalLink className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div>
                  <label className="label-m3">Meta App ID</label>
                  <input readOnly value="1365509778929483" className="input-m3 mt-1 font-mono text-xs" />
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
              <div className="space-y-4">
                {[
                  { event: 'OTP Sent', time: 'Just now', phone: '+91 987***1234' },
                  { event: 'Delivered', time: '1m ago', phone: '+91 701***5678' },
                  { event: 'Booking Confirmed', time: '5m ago', phone: '+91 888***9999' },
                  { event: 'OTP Sent', time: '12m ago', phone: '+91 999***0000' },
                ].map((log, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-on-surface">{log.event}</span>
                        <span className="text-[10px] text-outline">{log.time}</span>
                      </div>
                      <p className="text-on-surface-variant">{log.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="tonal" className="w-full mt-6 text-xs">View Full Event Log</Button>
            </div>

            <div className="card-m3 p-6 bg-gradient-to-br from-primary/5 to-transparent">
              <h3 className="text-sm font-black text-on-surface mb-2 uppercase tracking-tight">Review Guidance</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                This integration utilizes webhooks for <strong>manage_events</strong> to ensure message reliability and 
                <strong>business_management</strong> to synchronize shop profiles with WhatsApp metadata.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
