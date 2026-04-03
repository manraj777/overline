import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a review for a completed booking
   */
  async create(dto: CreateReviewDto, userId: string) {
    // Find the booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only review your own bookings');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed bookings');
    }

    if (booking.review) {
      throw new BadRequestException('This booking has already been reviewed');
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        userId,
        shopId: booking.shopId,
        rating: dto.rating,
        comment: dto.comment,
        staffRating: dto.staffRating,
        isVerified: true,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        booking: {
          select: { bookingNumber: true, services: true },
        },
      },
    });

    // Update shop's average rating (could also use a trigger)
    await this.updateShopRating(booking.shopId);

    return review;
  }

  /**
   * Get reviews for a shop
   */
  async findByShop(shopId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { shopId, isPublic: true },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { shopId, isPublic: true } }),
    ]);

    // Get rating stats
    const stats = await this.getShopRatingStats(shopId);

    return {
      data: reviews,
      stats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get reviews linked to current staff member in a shop.
   * Supports both new `staffProfileId` linkage and legacy booking `staffId` linkage.
   */
  async findForStaff(shopId: string, userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [staffProfile, staff] = await Promise.all([
      this.prisma.staffProfile.findFirst({
        where: { shopId, userId, isActive: true },
        select: { id: true },
      }),
      this.prisma.staff.findFirst({
        where: { shopId, userId, isActive: true },
        select: { id: true },
      }),
    ]);

    if (!staffProfile && !staff) {
      return {
        data: [],
        stats: {
          averageRating: 0,
          totalReviews: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    const staffReviewFilter = {
      shopId,
      isPublic: true,
      OR: [
        ...(staffProfile ? [{ staffProfileId: staffProfile.id }] : []),
        ...(staff ? [{ booking: { staffId: staff.id } }] : []),
      ],
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: staffReviewFilter,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              services: {
                select: {
                  serviceName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: staffReviewFilter }),
    ]);

    const ratings = await this.prisma.review.findMany({
      where: staffReviewFilter,
      select: { rating: true },
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    ratings.forEach((r) => {
      sum += r.rating;
      distribution[r.rating as keyof typeof distribution]++;
    });

    return {
      data: reviews,
      stats: {
        averageRating: ratings.length ? Math.round((sum / ratings.length) * 10) / 10 : 0,
        totalReviews: ratings.length,
        distribution,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Increment helpful vote count for a review
   */
  async incrementHelpfulCount(reviewId: string, userId: string) {
    const existing = await this.prisma.helpfulVote.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    });

    if (existing) {
      throw new BadRequestException('You have already marked this review as helpful');
    }

    await this.prisma.$transaction([
      this.prisma.helpfulVote.create({
        data: { userId, reviewId },
      }),
      this.prisma.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
      }),
    ]);

    return { success: true };
  }

  /**
   * Get rating statistics for a shop
   */
  async getShopRatingStats(shopId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { shopId, isPublic: true },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    reviews.forEach((r) => {
      sum += r.rating;
      distribution[r.rating as keyof typeof distribution]++;
    });

    return {
      averageRating: Math.round((sum / reviews.length) * 10) / 10,
      totalReviews: reviews.length,
      distribution,
    };
  }

  /**
   * Reply to a review (shop owner only)
   */
  async replyToReview(reviewId: string, dto: ReplyReviewDto, userId: string, tenantId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { shop: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.shop.tenantId !== tenantId) {
      throw new ForbiddenException('You can only reply to reviews for your shop');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        reply: dto.reply,
        repliedAt: new Date(),
      },
    });
  }

  /**
   * Get user's reviews
   */
  async findByUser(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        shop: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        booking: {
          select: { bookingNumber: true, completedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update shop's cached average rating
   */
  private async updateShopRating(shopId: string) {
    const stats = await this.getShopRatingStats(shopId);

    // Store in shop's settings JSON field
    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        settings: {
          averageRating: stats.averageRating,
          totalReviews: stats.totalReviews,
        },
      },
    });
  }

  /**
   * Create user feedback from owner/staff (bidirectional rating like Uber)
   */
  async createUserFeedback(
    dto: {
      bookingId: string;
      userId: string;
      rating: number;
      behavior?: string;
      note?: string;
      wasOnTime?: boolean;
      wasPolite?: boolean;
      wouldServeAgain?: boolean;
    },
    staffId: string,
    shopId: string,
  ) {
    // Verify booking exists and belongs to this shop
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.shopId !== shopId) {
      throw new ForbiddenException('Booking does not belong to your shop');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Can only give feedback for completed bookings');
    }

    // Check if feedback already exists
    const existingFeedback = await this.prisma.userFeedback.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (existingFeedback) {
      throw new BadRequestException('Feedback already submitted for this booking');
    }

    // Create feedback
    const feedback = await this.prisma.userFeedback.create({
      data: {
        bookingId: dto.bookingId,
        userId: dto.userId,
        shopId,
        staffId,
        rating: dto.rating,
        behavior: dto.behavior,
        note: dto.note,
        wasOnTime: dto.wasOnTime ?? true,
        wasPolite: dto.wasPolite ?? true,
        wouldServeAgain: dto.wouldServeAgain ?? true,
      },
    });

    // Update user's trust score based on feedback
    await this.updateUserTrustFromFeedback(dto.userId, dto.rating, dto.wasOnTime, dto.wasPolite);

    return feedback;
  }

  /**
   * Update user trust score based on owner/staff feedback
   */
  private async updateUserTrustFromFeedback(
    userId: string,
    rating: number,
    wasOnTime?: boolean,
    wasPolite?: boolean,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    // Calculate trust impact
    let trustAdjustment = 0;

    // Rating impact: 5 stars = +2, 4 stars = +1, 3 stars = 0, 2 stars = -1, 1 star = -3
    trustAdjustment += (rating - 3) * 1.5;

    // On-time bonus/penalty
    if (wasOnTime === false) {
      trustAdjustment -= 2;
    } else if (wasOnTime === true) {
      trustAdjustment += 0.5;
    }

    // Politeness bonus/penalty
    if (wasPolite === false) {
      trustAdjustment -= 3;
    } else if (wasPolite === true) {
      trustAdjustment += 0.5;
    }

    const newTrustScore = Math.max(0, Math.min(100, user.trustScore + trustAdjustment));

    await this.prisma.user.update({
      where: { id: userId },
      data: { trustScore: newTrustScore },
    });
  }

  /**
   * Get user's feedback history (for shops to see customer rating)
   */
  async getUserFeedbackHistory(userId: string) {
    const feedbacks = await this.prisma.userFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalFeedbacks = feedbacks.length;
    const averageRating =
      totalFeedbacks > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks : 5;
    const onTimeRate =
      totalFeedbacks > 0 ? feedbacks.filter((f) => f.wasOnTime).length / totalFeedbacks : 1;
    const politeRate =
      totalFeedbacks > 0 ? feedbacks.filter((f) => f.wasPolite).length / totalFeedbacks : 1;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalFeedbacks,
      onTimeRate: Math.round(onTimeRate * 100),
      politeRate: Math.round(politeRate * 100),
    };
  }
}
