import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('platform')
@Controller('admin/platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
export class PlatformController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide statistics' })
  async getStats() {
    const [totalUsers, totalShops, totalBookings, revenueResult, recentUsers, recentShops] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.shop.count({ where: { isActive: true } }),
        this.prisma.booking.count(),
        this.prisma.booking.aggregate({
          _sum: { totalAmount: true },
          where: { status: { in: ['COMPLETED', 'CONFIRMED'] } },
        }),
        this.prisma.user.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        }),
        this.prisma.shop.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            isActive: true,
            createdAt: true,
            owner: { select: { name: true, email: true } },
          },
        }),
      ]);

    return {
      totalUsers,
      totalShops,
      totalBookings,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      recentUsers,
      recentShops,
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'List all platform users with filtering' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          avatarUrl: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page: Number(page), limit: take };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get single user details' })
  async getUser(@Param('id') id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        avatarUrl: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        _count: { select: { bookings: true } },
      },
    });
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (toggle active, etc.)' })
  async updateUser(@Param('id') id: string, @Body() body: { isActive?: boolean }) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: body.isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  @Get('shops')
  @ApiOperation({ summary: 'List all shops with filtering' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getShops(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
          isActive: true,
          createdAt: true,
          owner: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { bookings: true, staff: true, services: true } },
        },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return { shops, total, page: Number(page), limit: take };
  }

  @Get('shops/:id')
  @ApiOperation({ summary: 'Get single shop details' })
  async getShop(@Param('id') id: string) {
    return this.prisma.shop.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { bookings: true, staff: true, services: true } },
      },
    });
  }

  @Patch('shops/:id')
  @ApiOperation({ summary: 'Update shop (toggle active, etc.)' })
  async updateShop(@Param('id') id: string, @Body() body: { isActive?: boolean }) {
    return this.prisma.shop.update({
      where: { id },
      data: { isActive: body.isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  @Get('bookings/:query')
  @ApiOperation({ summary: 'Search booking by number or ID' })
  async getBooking(@Param('query') query: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [
          { id: query },
          { bookingNumber: { equals: query, mode: 'insensitive' } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        shop: { select: { id: true, name: true, slug: true, address: true, phone: true } },
        services: true,
        payment: true,
        staff: { select: { id: true, name: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  @Patch('bookings/:id/cancel')
  @ApiOperation({ summary: 'Force cancel booking from superadmin console' })
  async cancelBooking(@Param('id') id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }
}
