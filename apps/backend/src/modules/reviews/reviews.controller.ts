import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a review for a completed booking' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or already reviewed' })
  async create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.create(dto, user.id);
  }

  @Get('shop/:shopId')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of reviews with stats' })
  async findByShop(
    @Param('shopId') shopId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findByShop(shopId, page || 1, limit || 10);
  }

  @Get('shop/:shopId/stats')
  @Public()
  @ApiOperation({ summary: 'Get rating statistics for a shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiResponse({ status: 200, description: 'Rating statistics' })
  async getStats(@Param('shopId') shopId: string) {
    return this.reviewsService.getShopRatingStats(shopId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user\'s reviews' })
  @ApiResponse({ status: 200, description: 'List of user\'s reviews' })
  async findMyReviews(@CurrentUser() user: any) {
    return this.reviewsService.findByUser(user.id);
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reply to a review (shop owner only)' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Reply added' })
  async reply(
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.replyToReview(id, dto, user.id, user.tenantId);
  }
}
