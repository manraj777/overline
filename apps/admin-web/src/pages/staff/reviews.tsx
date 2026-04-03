import { useMemo, useState } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import { Badge, Button, Card, Loading, useToast } from '@/components/ui';
import { useReplyToReview, useStaffShopReviews } from '@/hooks';

type ReviewFilter = {
  rating: 'ALL' | 1 | 2 | 3 | 4 | 5;
  withComment: boolean;
  unanswered: boolean;
};

export default function StaffReviewsPage() {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<ReviewFilter>({ rating: 'ALL', withComment: false, unanswered: false });
  const { data: reviewsData, isLoading: loadingReviews } = useStaffShopReviews({
    page: 1,
    limit: 100,
    rating: filters.rating === 'ALL' ? undefined : filters.rating,
    withComment: filters.withComment || undefined,
    unanswered: filters.unanswered || undefined,
  });
  const replyMutation = useReplyToReview();

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const reviews = useMemo(() => (Array.isArray(reviewsData?.data) ? reviewsData.data : []), [reviewsData?.data]);

  const overview = useMemo(() => {
    const stats = reviewsData?.stats;
    return {
      avg: Number(stats?.averageRating || 0),
      total: Number(stats?.totalReviews || 0),
      distribution: (stats?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) as Record<number, number>,
      fiveStarPct: Number(stats?.fiveStarPct || 0),
      responseRate: Number(stats?.responseRate || 0),
    };
  }, [reviewsData?.stats]);

  const submitReply = async (reviewId: string) => {
    const draft = (replyDrafts[reviewId] || '').trim();
    if (!draft) return;
    try {
      await replyMutation.mutateAsync({ reviewId, reply: draft });
      setReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
      addToast({ type: 'success', title: 'Reply posted' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Reply failed', message: error?.response?.data?.message || 'Try again.' });
    }
  };

  if (loadingReviews) {
    return <Loading text="Loading reviews..." />;
  }

  return (
    <>
      <Head>
        <title>My Reviews - Staff</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-500">Ratings and feedback for your completed bookings.</p>
        </div>

        <Card>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-5xl font-bold text-gray-900">{overview.avg.toFixed(1)}★</p>
              <p className="mt-2 text-sm text-gray-500">Average rating</p>
              <div className="mt-4 space-y-2 text-sm text-gray-700">
                <p>Total reviews: <span className="font-semibold">{overview.total}</span></p>
                <p>5★ %: <span className="font-semibold">{overview.fiveStarPct.toFixed(0)}%</span></p>
                <p>Response rate: <span className="font-semibold">{overview.responseRate.toFixed(0)}%</span></p>
              </div>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = overview.distribution[star];
                const pct = overview.total > 0 ? (count / overview.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-8 text-sm text-gray-700">{star}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                      <div className="h-2 rounded bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={filters.rating}
              onChange={(e) => setFilters((prev) => ({ ...prev, rating: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) as any }))}
              className="h-10 rounded border border-gray-300 px-3 text-sm"
            >
              <option value="ALL">All ratings</option>
              <option value="5">5★</option>
              <option value="4">4★</option>
              <option value="3">3★</option>
              <option value="2">2★</option>
              <option value="1">1★</option>
            </select>

            <label className="inline-flex items-center gap-2 rounded border border-gray-300 px-3 text-sm">
              <input
                type="checkbox"
                checked={filters.withComment}
                onChange={(e) => setFilters((prev) => ({ ...prev, withComment: e.target.checked }))}
              />
              With comment
            </label>

            <label className="inline-flex items-center gap-2 rounded border border-gray-300 px-3 text-sm">
              <input
                type="checkbox"
                checked={filters.unanswered}
                onChange={(e) => setFilters((prev) => ({ ...prev, unanswered: e.target.checked }))}
              />
              Unanswered only
            </label>
          </div>
        </Card>

        <div className="space-y-4">
          {reviews.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-500">No reviews match the selected filters.</p>
            </Card>
          ) : (
            reviews.map((review: any) => (
              <Card key={review.id}>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                    {review.user?.avatarUrl ? (
                      <img src={review.user.avatarUrl} alt={review.user?.name || 'Customer'} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{review.user?.name || 'Customer'}</p>
                        <p className="text-xs text-gray-500">{format(new Date(review.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                      <Badge variant="info">{review.rating}★</Badge>
                    </div>

                    <p className="mt-2 text-sm text-gray-700">{review.comment || 'No written comment provided.'}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      Service: {review.booking?.service?.name || review.booking?.services?.[0]?.serviceName || 'Service from booking'}
                    </p>
                    <p className="text-xs text-gray-500">Helpful: {Number(review.helpfulCount || 0)}</p>

                    {review.reply ? (
                      <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                        <p className="font-medium">Your reply</p>
                        <p className="mt-1">{review.reply}</p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <textarea
                          rows={2}
                          value={replyDrafts[review.id] || ''}
                          onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                          placeholder="Write a reply..."
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => submitReply(review.id)}
                            isLoading={replyMutation.isPending}
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
