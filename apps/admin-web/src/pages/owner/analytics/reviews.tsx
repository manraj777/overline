import Head from 'next/head';
import { Card, Button } from '@/components/ui';
import { Sparkles, Star, MessageSquare, Heart, ThumbsUp, ArrowUpRight, BarChart3 } from 'lucide-react';

export default function OwnerReviewsAnalyticsPage() {
  return (
    <>
      <Head>
        <title>Reviews Analytics - Owner</title>
      </Head>
      <div className="space-y-8 max-w-5xl mx-auto py-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Coming Soon
            </span>
            <h1 className="text-3xl font-black text-on-surface tracking-tight">Reviews Analytics</h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Analyze customer sentiment, track Google Reviews sync, and monitor staff-level feedback to build brand loyalty.
            </p>
          </div>
          <Button className="md:self-start bg-primary text-white font-bold hover:bg-primary/95 text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-button">
            Request Beta Access <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Visual Mockup/Interactive Preview */}
        <div className="card-m3 p-6 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden border border-outline-variant/15">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-12 -translate-y-12" />
          <h3 className="text-xs font-black text-primary/70 uppercase tracking-widest mb-6">Interactive Interface Preview</h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            {/* Rating Summary */}
            <div className="md:col-span-4 bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 flex flex-col justify-between">
              <div>
                <span className="text-xs text-on-surface-variant font-medium">Average Rating</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-4xl font-black text-on-surface">4.85</p>
                  <span className="text-xs text-emerald-600 font-bold">Excellent</span>
                </div>
                <div className="flex gap-0.5 text-amber-500 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 stroke-amber-500" />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant leading-relaxed mt-4 pt-4 border-t border-outline-variant/5">
                Based on <strong>142 reviews</strong> across platforms (112 Google Reviews, 30 Overline Bookings).
              </p>
            </div>

            {/* Rating Bars */}
            <div className="md:col-span-8 bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 space-y-2">
              <span className="text-xs text-on-surface-variant font-medium block mb-2">Rating Distribution</span>
              {[
                { rating: 5, pct: '88%', count: 125 },
                { rating: 4, pct: '8%', count: 11 },
                { rating: 3, pct: '3%', count: 4 },
                { rating: 2, pct: '1%', count: 1 },
                { rating: 1, pct: '0%', count: 1 },
              ].map((row) => (
                <div key={row.rating} className="flex items-center gap-3 text-xs">
                  <span className="w-3 font-bold text-on-surface">{row.rating}</span>
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <div className="flex-1 bg-surface-container h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: row.pct }} />
                  </div>
                  <span className="w-8 text-right text-outline">{row.pct}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Feed */}
          <div className="bg-surface-container-low/60 backdrop-blur-sm rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="p-4 border-b border-outline-variant/10 bg-surface-container-low flex justify-between items-center">
              <span className="text-xs font-bold text-on-surface">Recent Feedback Feed</span>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Live Feed</span>
            </div>
            <div className="p-4 space-y-4">
              {[
                { name: 'Karan Sharma', rating: 5, staff: 'Amit Sharma', source: 'Google Review', text: 'Amit is absolutely fantastic! The attention to detail during my beard styling session was impressive. Best salon experience in the city.', time: '2 hours ago' },
                { name: 'Megha Gupta', rating: 5, staff: 'Pooja Verma', source: 'Overline Booking', text: 'Clean styling chairs and very friendly staff. Pooja gave me a perfect layered haircut. Highly recommended!', time: '1 day ago' },
              ].map((review, i) => (
                <div key={i} className="space-y-2 pb-4 border-b border-outline-variant/5 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-on-surface-variant text-xs">
                        {review.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-xs">{review.name}</p>
                        <p className="text-[9px] text-outline">{review.time}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-0.5 text-amber-500">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-500 stroke-amber-500" />
                        ))}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[8px] ${
                        review.source === 'Google Review' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {review.source}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-medium pl-10">
                    "{review.text}"
                  </p>
                  <div className="pl-10 flex items-center gap-1.5">
                    <span className="text-[10px] text-outline font-medium">Service Specialist:</span>
                    <span className="text-[10px] font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded-md">
                      {review.staff}
                    </span>
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
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="font-black text-on-surface">Google Reviews Auto-Sync</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Connect your Google Business Profile with one click. Overline will pull, display, and analyze your reviews automatically, showing verified badges next to them.
            </p>
          </Card>

          <Card className="p-6 space-y-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ThumbsUp className="w-5 h-5" />
            </div>
            <h4 className="font-black text-on-surface">Semantic Sentiment tags</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              AI detects key terms and customer feelings from written reviews. Instantly discover if clients love your cleanliness, punctuality, or individual specialists.
            </p>
          </Card>

          <Card className="p-6 space-y-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="font-black text-on-surface">Staff Performance Rankings</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Compare average ratings and review count across all team specialists. Identify training needs or reward specialists with outstanding guest ratings.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
