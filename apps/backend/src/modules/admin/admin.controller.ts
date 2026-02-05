import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, BookingStatus, DayOfWeek } from '@prisma/client';
import { CreateWalkInDto } from './dto/create-walk-in.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('shops/:shopId/dashboard')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop dashboard data' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getDashboard(
    @Param('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.getDashboard(shopId, tenantId);
  }

  @Get('shops/:shopId/bookings')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop bookings' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', enum: BookingStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getBookings(
    @Param('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('date') date?: string,
    @Query('status') status?: BookingStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getBookings(shopId, tenantId, { date, status, page, limit });
  }

  @Patch('bookings/:bookingId/status')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update booking status' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  async updateBookingStatus(
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.updateBookingStatus(bookingId, dto.status, tenantId, dto.adminNotes);
  }

  @Post('shops/:shopId/walk-in')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a walk-in booking' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async createWalkIn(
    @Param('shopId') shopId: string,
    @Body() dto: CreateWalkInDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.createWalkIn(shopId, dto, tenantId);
  }

  @Get('shops/:shopId/staff')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop staff' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getStaff(
    @Param('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.getStaff(shopId, tenantId);
  }

  @Get('shops/:shopId/working-hours')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop working hours' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getWorkingHours(
    @Param('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.getWorkingHours(shopId, tenantId);
  }

  @Patch('shops/:shopId/working-hours/:dayOfWeek')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update working hours for a day' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'dayOfWeek', enum: DayOfWeek })
  async updateWorkingHours(
    @Param('shopId') shopId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
    @Body() dto: UpdateWorkingHoursDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.updateWorkingHours(shopId, dayOfWeek, dto, tenantId);
  }

  @Get('shops/:shopId/settings')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop settings' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getSettings(
    @Param('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.getShopSettings(shopId, tenantId);
  }

  @Patch('shops/:shopId/settings')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update shop settings' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async updateSettings(
    @Param('shopId') shopId: string,
    @Body() settings: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.updateShopSettings(shopId, tenantId, settings);
  }
}
