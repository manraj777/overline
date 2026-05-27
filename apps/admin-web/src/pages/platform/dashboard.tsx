import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Card } from '@/components/ui';
import {
  TrendingUp,
  Users,
  Store,
  DollarSign,
  Activity,
  Megaphone,
  CheckCircle2,
  Plus,
  Trash2,
  Send,
  ExternalLink,
  RefreshCw,
  Gift,
  AlertTriangle,
  Ticket,
} from 'lucide-react';
import api from '@/lib/api';

interface PlatformStats {
  totalUsers: number;
  totalShops: number;
  totalBookings: number;
  totalRevenue: number;
}

interface PromoCode {
  id: string;
  code: string;
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  usageCount: number;
  status: 'ACTIVE' | 'EXPIRED';
}

interface WhatsAppContact {
  phone: string;
  status: 'PENDING' | 'SENT' | 'REGISTERED';
  sentAt?: string;
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Promo Codes State (persisted in LocalStorage)
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newCodeType, setNewCodeType] = useState<'FLAT' | 'PERCENTAGE'>('PERCENTAGE');
  const [newCodeValue, setNewCodeValue] = useState(10);

  // WhatsApp Campaign State (persisted in LocalStorage)
  const [rawPhones, setRawPhones] = useState('');
  const [outreachMessage, setOutreachMessage] = useState(
    'Hello! We are Overline queue & appointment system. Add your shop at https://overline.in/register for FREE and enjoy zero commission booking! See details on Overline App.'
  );
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('shop_onboarding');

  // Booking search states
  const [searchBookingQuery, setSearchBookingQuery] = useState('');
  const [searchedBooking, setSearchedBooking] = useState<any>(null);
  const [searchingBooking, setSearchingBooking] = useState(false);
  const [searchBookingError, setSearchBookingError] = useState<string | null>(null);

  const handleSearchBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchBookingQuery.trim()) return;
    setSearchingBooking(true);
    setSearchBookingError(null);
    setSearchedBooking(null);
    try {
      const res = await api.get(`/admin/platform/bookings/${searchBookingQuery.trim()}`);
      setSearchedBooking(res.data);
    } catch (err: any) {
      setSearchBookingError(err.response?.data?.message || 'Booking not found');
    } finally {
      setSearchingBooking(false);
    }
  };

  const handleForceCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to force-cancel this booking? This will free up slot space immediately.')) return;
    try {
      await api.patch(`/admin/platform/bookings/${bookingId}/cancel`);
      alert('Booking successfully force-cancelled!');
      // Re-fetch booking details
      const res = await api.get(`/admin/platform/bookings/${bookingId}`);
      setSearchedBooking(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  // Load stats and shops from backend platform APIs
  const fetchData = async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const [statsRes, shopsRes] = await Promise.all([
        api.get('/admin/platform/stats'),
        api.get('/admin/platform/shops?limit=100'),
      ]);
      setStats(statsRes.data);
      setShops(shopsRes.data.shops || []);
    } catch (err: any) {
      console.error('Failed to fetch platform superadmin data', err);
      setError(
        err.response?.data?.message || 'Access Denied. Only Platform Superadmins can view this dashboard.'
      );
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Load initial promo codes
    const storedPromos = localStorage.getItem('overline_promos');
    if (storedPromos) {
      setPromoCodes(JSON.parse(storedPromos));
    } else {
      const defaultPromos: PromoCode[] = [
        { id: '1', code: 'WELCOME50', type: 'FLAT', value: 50, usageCount: 24, status: 'ACTIVE' },
        { id: '2', code: 'OVERLINE10', type: 'PERCENTAGE', value: 10, usageCount: 15, status: 'ACTIVE' },
        { id: '3', code: 'OVERLINE20', type: 'PERCENTAGE', value: 20, usageCount: 8, status: 'ACTIVE' },
      ];
      setPromoCodes(defaultPromos);
      localStorage.setItem('overline_promos', JSON.stringify(defaultPromos));
    }

    // Load WhatsApp contacts
    const storedContacts = localStorage.getItem('overline_outreach_contacts');
    if (storedContacts) {
      setContacts(JSON.parse(storedContacts));
    }
  }, []);

  // Sync Promo Codes to localStorage
  const savePromos = (updated: PromoCode[]) => {
    setPromoCodes(updated);
    localStorage.setItem('overline_promos', JSON.stringify(updated));
  };

  // Sync WhatsApp Contacts to localStorage
  const saveContacts = (updated: WhatsAppContact[]) => {
    setContacts(updated);
    localStorage.setItem('overline_outreach_contacts', JSON.stringify(updated));
  };

  // Generate a new promo code
  const handleAddPromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (promoCodes.some((p) => p.code === cleanCode)) {
      alert('Promo code already exists!');
      return;
    }

    const created: PromoCode = {
      id: Date.now().toString(),
      code: cleanCode,
      type: newCodeType,
      value: Number(newCodeValue) || 0,
      usageCount: 0,
      status: 'ACTIVE',
    };

    savePromos([...promoCodes, created]);
    setNewCode('');
  };

  // Delete a promo code
  const handleDeletePromo = (id: string) => {
    savePromos(promoCodes.filter((p) => p.id !== id));
  };

  // Change WhatsApp template
  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
    if (template === 'shop_onboarding') {
      setOutreachMessage(
        'Hello! We are Overline queue & appointment system. Add your shop at https://overline.in/register for FREE and enjoy zero commission booking! See details on Overline App.'
      );
    } else if (template === 'customer_promo') {
      setOutreachMessage(
        'Skip the long waiting lines at your local salon or clinic! Book appointment instantly on Overline. Use code WELCOME50 for flat Rs.50 off on first booking. Try now at https://overline.in'
      );
    } else if (template === 'whatspp_followup') {
      setOutreachMessage(
        'Hey there, did you get a chance to register your shop on Overline? It takes less than 2 minutes. Register here: https://overline.in/register. Let us know if you need any help!'
      );
    }
  };

  // Process pasted phone numbers and add to list
  const handleProcessPhones = () => {
    if (!rawPhones.trim()) return;

    // Extract all 10-digit or 12-digit digits
    const parts = rawPhones.split(/[,\n]/);
    const list: WhatsAppContact[] = [];

    parts.forEach((p) => {
      const digits = p.replace(/\D/g, '');
      // Format to 10 digits
      const phone10 = digits.slice(-10);
      if (phone10.length === 10 && /^[6-9]\d{9}$/.test(phone10)) {
        list.push({
          phone: phone10,
          status: 'PENDING',
        });
      }
    });

    if (list.length === 0) {
      alert('No valid 10-digit Indian phone numbers found.');
      return;
    }

    // Merge duplicates
    const existingMap = new Map(contacts.map((c) => [c.phone, c]));
    list.forEach((item) => {
      if (!existingMap.has(item.phone)) {
        existingMap.set(item.phone, item);
      }
    });

    const merged = Array.from(existingMap.values());
    saveContacts(merged);
    setRawPhones('');
  };

  // Direct WhatsApp Deep Link opener (100% Free)
  const handleSendWhatsApp = (phone: string) => {
    const encodedMsg = encodeURIComponent(outreachMessage);
    const link = `https://api.whatsapp.com/send?phone=91${phone}&text=${encodedMsg}`;
    window.open(link, '_blank');

    // Mark as sent
    const updated = contacts.map((c) => {
      if (c.phone === phone && c.status === 'PENDING') {
        return { ...c, status: 'SENT' as const, sentAt: new Date().toLocaleDateString() };
      }
      return c;
    });
    saveContacts(updated);
  };

  // Clear contact lists
  const handleClearContacts = () => {
    if (confirm('Clear the entire campaign list?')) {
      saveContacts([]);
    }
  };

  // Match campaign phone numbers with real registered shops
  const registeredShopPhones = React.useMemo(() => {
    return new Set(
      shops
        .map((s) => {
          const raw = s.owner?.phone || s.phone;
          if (!raw) return null;
          return raw.replace(/\D/g, '').slice(-10); // get last 10 digits
        })
        .filter(Boolean)
    );
  }, [shops]);

  const trackedContacts = React.useMemo(() => {
    return contacts.map((c) => {
      if (registeredShopPhones.has(c.phone)) {
        return { ...c, status: 'REGISTERED' as const };
      }
      return c;
    });
  }, [contacts, registeredShopPhones]);

  // Outreach Analytics
  const totalOutreach = trackedContacts.length;
  const totalJoined = trackedContacts.filter((c) => c.status === 'REGISTERED').length;
  const conversionRate = totalOutreach > 0 ? ((totalJoined / totalOutreach) * 100).toFixed(1) : '0.0';

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center shadow-sm">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Superadmin Growth Center | Overline Admin</title>
      </Head>

      <div className="space-y-8 animate-fade-in pb-20 px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-indigo-600" /> Platform Growth & Promotion Center
            </h1>
            <p className="text-gray-500 mt-1">
              Superadmin outreach console, free WhatsApp promotion campaign builder, and promo code controller.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-200 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>

        {/* Booking Search & Diagnostics Console */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Booking Diagnostic & Lookup Console</h3>
              <p className="text-xs text-gray-500">Search by Booking ID or 6-character Booking Number (e.g. OV-XXXX) to resolve verification or queue issues.</p>
            </div>
          </div>

          <form onSubmit={handleSearchBooking} className="flex gap-3">
            <input
              type="text"
              value={searchBookingQuery}
              onChange={(e) => setSearchBookingQuery(e.target.value)}
              placeholder="Enter Booking ID or Number (e.g. OV-5E9D)"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
            />
            <button
              type="submit"
              disabled={searchingBooking}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
            >
              {searchingBooking ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchBookingError && (
            <p className="text-sm font-bold text-red-500 bg-red-50 border border-red-100 p-3 rounded-xl">{searchBookingError}</p>
          )}

          {searchedBooking && (
            <div className="border border-indigo-100 bg-indigo-50/10 rounded-3xl p-6 space-y-4 animate-fade-in text-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-100/50 pb-4">
                <div>
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Booking Match</p>
                  <h4 className="text-xl font-black text-gray-900 mt-1">
                    {searchedBooking.bookingNumber} <span className="text-xs text-gray-400 font-bold">({searchedBooking.id})</span>
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    searchedBooking.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    searchedBooking.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    searchedBooking.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                    'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {searchedBooking.status}
                  </span>
                  {searchedBooking.verificationCode && (
                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-extrabold tracking-widest">
                      OTP: {searchedBooking.verificationCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Details</p>
                  <p className="font-bold text-gray-800">{searchedBooking.customerName || searchedBooking.user?.name || 'Walk-in Guest'}</p>
                  <p className="text-gray-500">{searchedBooking.customerPhone || searchedBooking.user?.phone || 'No phone'}</p>
                  <p className="text-gray-500 text-xs">{searchedBooking.customerEmail || searchedBooking.user?.email || ''}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shop & Specialist</p>
                  <p className="font-bold text-gray-800">{searchedBooking.shop?.name}</p>
                  <p className="text-gray-500 text-xs">{searchedBooking.shop?.address}</p>
                  {searchedBooking.staff && (
                    <p className="text-gray-600 font-medium text-xs mt-1">Assigned: {searchedBooking.staff.name}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Schedule & Price</p>
                  <p className="font-bold text-gray-800">
                    {new Date(searchedBooking.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {new Date(searchedBooking.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - {new Date(searchedBooking.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-indigo-600 font-extrabold text-sm mt-1">Amount: ₹{searchedBooking.totalAmount}</p>
                </div>
              </div>

              {searchedBooking.services && searchedBooking.services.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Selected Services</p>
                  <div className="flex flex-wrap gap-2">
                    {searchedBooking.services.map((s: any) => (
                      <span key={s.id} className="text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md border border-gray-200">
                        {s.serviceName || s.name} (₹{s.price})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {searchedBooking.status !== 'CANCELLED' && searchedBooking.status !== 'COMPLETED' && (
                <div className="pt-4 border-t border-indigo-100/50 flex justify-end gap-3">
                  <button
                    onClick={() => handleForceCancelBooking(searchedBooking.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-100 transition shadow-sm"
                  >
                    Force Cancel Booking
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Platform GMV</p>
              {loadingStats ? (
                <div className="h-8 w-24 bg-gray-100 animate-pulse rounded-md mt-2" />
              ) : (
                <p className="text-2xl font-black text-gray-900 mt-1">
                  ₹{stats?.totalRevenue ? Number(stats.totalRevenue).toLocaleString() : '0'}
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Registered Shops</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-md mt-2" />
              ) : (
                <p className="text-2xl font-black text-gray-900 mt-1">{stats?.totalShops || '0'}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Users</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-md mt-2" />
              ) : (
                <p className="text-2xl font-black text-gray-900 mt-1">{stats?.totalUsers || '0'}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Bookings</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-md mt-2" />
              ) : (
                <p className="text-2xl font-black text-gray-900 mt-1">{stats?.totalBookings || '0'}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Outreach and Promo Code split sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          
          {/* WhatsApp Promotion Hub (Free Marketing) */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 border-gray-200/60 shadow-sm rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Free WhatsApp Outreach Hub</h3>
                  <p className="text-xs text-gray-500">Manual copy/send helper to register shops with zero platform fees.</p>
                </div>
              </div>

              {/* Paste target numbers */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Paste Target Shop Owner Numbers
                </label>
                <textarea
                  value={rawPhones}
                  onChange={(e) => setRawPhones(e.target.value)}
                  placeholder="Paste comma-separated or new-line phone numbers (e.g. 9876543210, 9988776655)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-medium focus:border-indigo-500 focus:bg-white outline-none min-h-[100px] resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleClearContacts}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition"
                  >
                    Clear Campaign List
                  </button>
                  <button
                    onClick={handleProcessPhones}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                  >
                    Add to Campaign
                  </button>
                </div>
              </div>

              {/* Campaign Message Composer */}
              <div className="mt-6 space-y-4 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Outreach Message & Presets
                  </label>
                  <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                    <button
                      onClick={() => handleTemplateChange('shop_onboarding')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedTemplate === 'shop_onboarding' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Shop Invitation
                    </button>
                    <button
                      onClick={() => handleTemplateChange('customer_promo')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedTemplate === 'customer_promo' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Customer Promo
                    </button>
                    <button
                      onClick={() => handleTemplateChange('whatspp_followup')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedTemplate === 'whatspp_followup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Follow-up
                    </button>
                  </div>
                </div>

                <textarea
                  value={outreachMessage}
                  onChange={(e) => setOutreachMessage(e.target.value)}
                  className="w-full bg-emerald-50/20 border border-emerald-100 rounded-xl p-4 text-sm font-medium focus:border-emerald-500 focus:bg-white outline-none min-h-[80px]"
                />
              </div>

              {/* Campaign Table */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 mb-4">Outreach & Live Registration Tracker</h4>
                {trackedContacts.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">No contacts added. Paste numbers above to start.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-gray-200/60 rounded-2xl shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3">Phone Number</th>
                          <th className="px-4 py-3">Outreach Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {trackedContacts.map((c) => (
                          <tr key={c.phone} className="hover:bg-gray-50/50 transition">
                            <td className="px-4 py-3 font-bold text-gray-900">
                              +91 {c.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}
                            </td>
                            <td className="px-4 py-3">
                              {c.status === 'REGISTERED' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Joined (Registered)
                                </span>
                              ) : c.status === 'SENT' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                  <Send className="w-3 h-3 text-blue-500" /> Messaged
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-100">
                                  Pending Message
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {c.status === 'REGISTERED' ? (
                                <span className="text-xs text-emerald-600 font-bold pr-2 flex items-center justify-end gap-1">
                                  Live Match <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSendWhatsApp(c.phone)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                                >
                                  Send on WA <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Panel: Promo Codes & Outreach Stats */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Outreach Campaign Analytics */}
            <Card className="p-6 border-gray-200/60 shadow-sm rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" /> Campaign Highlights
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">Outreached</p>
                  <p className="text-2xl font-black text-white mt-1">{totalOutreach}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">Shops Joined</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{totalJoined}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-100 font-medium">Conversion Rate</span>
                  <span className="text-2xl font-black text-indigo-300">{conversionRate}%</span>
                </div>
                <p className="text-xs text-indigo-200/70 mt-2 leading-relaxed">
                  Real-time database conversion check matching phone outreach lists against active shops.
                </p>
              </div>
            </Card>

            {/* Promo Code Controller */}
            <Card className="p-6 border-gray-200/60 shadow-sm rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Promo Code Manager</h3>
                  <p className="text-xs text-gray-500">Track and generate discount vouchers.</p>
                </div>
              </div>

              {/* Generate Promo Code Form */}
              <form onSubmit={handleAddPromoCode} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">
                    Promo Code Name
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="E.g. WELCOME50"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">
                      Type
                    </label>
                    <select
                      value={newCodeType}
                      onChange={(e) => setNewCodeType(e.target.value as any)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FLAT">Flat (Rs.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">
                      Value
                    </label>
                    <input
                      type="number"
                      value={newCodeValue}
                      onChange={(e) => setNewCodeValue(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                      min={1}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Promo Code
                </button>
              </form>

              {/* Promo codes table */}
              <div className="mt-8 border-t border-gray-100 pt-6 space-y-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">Active Promos</h4>
                <div className="space-y-3">
                  {promoCodes.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm"
                    >
                      <div>
                        <p className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-violet-500" /> {p.code}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.type === 'FLAT' ? `Flat ₹${p.value} off` : `${p.value}% discount`} • {p.usageCount} bookings
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePromo(p.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50/50 transition"
                        title="Remove code"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
