import React from 'react';
import Head from 'next/head';
import { Save, Upload, Bell, Clock, Globe, CreditCard } from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'hours', label: 'Working Hours', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <>
      <Head>
        <title>Settings - Overline Admin</title>
      </Head>

      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Configure your shop preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tabs */}
          <div className="lg:w-64">
            <Card className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'general' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Shop Information</h2>
                <form className="space-y-6">
                  <div className="flex items-start gap-6">
                    <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        Upload Logo
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG up to 2MB. Recommended: 200x200px
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Shop Name" defaultValue="Elite Cuts Salon" />
                    <Input label="Slug" defaultValue="elite-cuts-salon" disabled />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                      defaultValue="Premium salon offering haircuts, styling, and grooming services."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Phone" type="tel" defaultValue="+91 9876543210" />
                    <Input label="Email" type="email" defaultValue="info@elitecuts.com" />
                  </div>

                  <div>
                    <Input label="Address" defaultValue="123 Main Street, Mumbai 400001" />
                  </div>

                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </form>
              </Card>
            )}

            {activeTab === 'hours' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Working Hours</h2>
                <div className="space-y-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                    (day) => (
                      <div key={day} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                        <div className="w-28 font-medium text-gray-900">{day}</div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            defaultChecked={day !== 'Sunday'}
                          />
                          <span className="text-sm text-gray-600">Open</span>
                        </label>
                        <div className="flex items-center gap-2 ml-auto">
                          <input
                            type="time"
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            defaultValue="09:00"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="time"
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            defaultValue="21:00"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
                <div className="mt-6">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Save Hours
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Customer Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Booking confirmation', enabled: true },
                        { label: 'Booking reminder (1 hour before)', enabled: true },
                        { label: 'Booking cancellation', enabled: true },
                        { label: 'Queue updates', enabled: false },
                      ].map((item) => (
                        <label key={item.label} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            defaultChecked={item.enabled}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Admin Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'New booking', enabled: true },
                        { label: 'Booking cancellation', enabled: true },
                        { label: 'Daily summary', enabled: false },
                      ].map((item) => (
                        <label key={item.label} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            defaultChecked={item.enabled}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'payments' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Payment Provider</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button className="p-4 border-2 border-primary-500 rounded-lg bg-primary-50 text-center">
                        <p className="font-medium text-primary-600">Razorpay</p>
                        <p className="text-xs text-gray-500 mt-1">Connected</p>
                      </button>
                      <button className="p-4 border-2 border-gray-200 rounded-lg text-center hover:border-gray-300">
                        <p className="font-medium text-gray-900">Stripe</p>
                        <p className="text-xs text-gray-500 mt-1">Not connected</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Razorpay Key ID"
                      type="password"
                      defaultValue="rzp_live_xxxxx"
                      placeholder="rzp_live_..."
                    />
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Payment Options</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Enable online payments', enabled: true },
                        { label: 'Allow pay at counter', enabled: true },
                        { label: 'Require upfront payment', enabled: false },
                      ].map((item) => (
                        <label key={item.label} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            defaultChecked={item.enabled}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
