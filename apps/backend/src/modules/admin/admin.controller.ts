import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  @Get('my-shops')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shops accessible by the current user' })
  async getMyShops(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.adminService.getMyShops(userId, tenantId, role);
  }

  @Get('shops/:shopId/dashboard')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop dashboard data' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getDashboard(@Param('shopId') shopId: string, @CurrentUser('tenantId') tenantId: string) {
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

  @Get('bookings')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop bookings by query parameter' })
  @ApiQuery({ name: 'shopId', required: true, description: 'Shop ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', enum: BookingStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getBookingsByQuery(
    @Query('shopId') shopId: string,
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
  async getStaff(@Param('shopId') shopId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getStaff(shopId, tenantId);
  }

  @Post('shops/:shopId/staff')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create staff member' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async createStaff(
    @Param('shopId') shopId: string,
    @Body() dto: { name: string; email: string; phone?: string; role: string; avatarUrl?: string },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.createStaff(shopId, dto, tenantId);
  }

  @Patch('shops/:shopId/staff/:staffId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update staff member' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  async updateStaff(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Body() dto: { name?: string; phone?: string; role?: string; isActive?: boolean; avatarUrl?: string },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.updateStaff(shopId, staffId, dto, tenantId);
  }

  @Delete('shops/:shopId/staff/:staffId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete staff member' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  async deleteStaff(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.deleteStaff(shopId, staffId, tenantId);
  }

  @Get('shops/:shopId/staff/:staffId/availability')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get staff availability (working hours and time-off)' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  async getStaffAvailability(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.getStaffAvailability(shopId, staffId, tenantId);
  }

  @Patch('shops/:shopId/staff/:staffId/availability/:dayOfWeek')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update staff working hours for a day' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  @ApiParam({ name: 'dayOfWeek', enum: DayOfWeek })
  async updateStaffAvailability(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
    @Body() dto: { startTime?: string; endTime?: string; isOff?: boolean },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.updateStaffWorkingHours(shopId, staffId, dayOfWeek, dto, tenantId);
  }

  @Post('shops/:shopId/staff/:staffId/time-off')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add staff time-off block' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  async addStaffTimeOff(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Body() dto: { startTime: string; endTime: string; reason?: string; isFullDay?: boolean },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.addStaffTimeOff(shopId, staffId, dto, tenantId);
  }

  @Delete('shops/:shopId/staff/:staffId/time-off/:timeOffId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete staff time-off block' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  @ApiParam({ name: 'timeOffId', description: 'Staff time-off ID' })
  async deleteStaffTimeOff(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Param('timeOffId') timeOffId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.deleteStaffTimeOff(shopId, staffId, timeOffId, tenantId);
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
  async getSettings(@Param('shopId') shopId: string, @CurrentUser('tenantId') tenantId: string) {
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
