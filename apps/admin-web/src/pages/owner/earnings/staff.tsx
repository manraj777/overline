import Head from 'next/head';
import { Card, Button } from '@/components/ui';
import { Sparkles, DollarSign, Users, Award, ArrowUpRight, ShieldCheck } from 'lucide-react';

export default function OwnerStaffEarningsPage() {
  return (
    <>
      <Head>
        <title>Staff Earnings Analytics - Owner</title>
      </Head>
      <div className="space-y-8 max-w-5xl mx-auto py-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Coming Soon
            </span>
            <h1 className="text-3xl font-black text-on-surface tracking-tight">Staff Earnings Analytics</h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Track individual specialist performance, automate commission payouts, and view detailed financial breakdowns.
            </p>
          </div>
          <Button className="md:self-start bg-primary text-white font-bold hover:bg-primary/95 text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-button">
            Request Early Access <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Visual Mockup/Interactive Preview */}
        <div className="card-m3 p-6 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden border border-outline-variant/15">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-12 -translate-y-12" />
          <h3 className="text-xs font-black text-primary/70 uppercase tracking-widest mb-6">Interactive Interface Preview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-on-surface-variant font-medium">Total Paid to Staff</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-on-surface">₹48,250</p>
              <span className="text-[10px] text-emerald-600 font-bold mt-1 block flex items-center gap-0.5">
                +14.2% <span className="text-outline font-medium">vs last month</span>
              </span>
            </div>

            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-on-surface-variant font-medium">Top Earner</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-on-surface">Amit Sharma</p>
              <span className="text-[10px] text-on-surface-variant font-medium mt-1 block">
                ₹18,400 earned this week
              </span>
            </div>

            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-on-surface-variant font-medium">Payout Progress</span>
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-on-surface">5 / 6 Paid</p>
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-primary h-full w-[83%]" />
              </div>
            </div>
          </div>

          {/* Table Mockup */}
          <div className="bg-surface-container-low/60 backdrop-blur-sm rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="p-4 border-b border-outline-variant/10 bg-surface-container-low flex justify-between items-center">
              <span className="text-xs font-bold text-on-surface">Staff Performance & Payouts</span>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">May Breakdown</span>
            </div>
            <div className="p-4 space-y-4">
              {[
                { name: 'Amit Sharma', role: 'Senior Stylist', bookings: 78, commission: '60%', payout: '₹18,400', status: 'Paid' },
                { name: 'Pooja Verma', role: 'Specialist', bookings: 62, commission: '50%', payout: '₹14,150', status: 'Paid' },
                { name: 'Rohan Sen', role: 'Junior Stylist', bookings: 41, commission: '40%', payout: '₹8,900', status: 'Pending' },
              ].map((staff, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-outline-variant/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-on-surface-variant">
                      {staff.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{staff.name}</p>
                      <p className="text-[10px] text-outline">{staff.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-outline">Bookings</p>
                      <p className="font-bold text-on-surface">{staff.bookings}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-outline">Commission</p>
                      <p className="font-bold text-on-surface">{staff.commission}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-outline">Payout</p>
                      <p className="font-bold text-on-surface text-primary">{staff.payout}</p>
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        staff.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {staff.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <h4 className="font-black text-on-surface">Flexible Commission Splits</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Define custom split models (percentage or fixed price) for each staff member or even per specific service. Overline calculates the math instantly.
            </p>
          </Card>

          <Card className="p-6 space-y-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-black text-on-surface">One-Click Direct Payouts</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Integrate with UPI payouts or bank transfer sheets. Disburse earnings directly to your staff's preferred payment methods with complete transaction history.
            </p>
          </Card>

          <Card className="p-6 space-y-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-black text-on-surface">Retention & Tips tracking</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Understand which staff members are driving repeat bookings, customer ratings, and earning the most customer tips. Reward your star performers.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
