import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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
}
