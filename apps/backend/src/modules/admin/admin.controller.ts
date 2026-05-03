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
import { Roles, ShopIdParam } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ShopMemberGuard } from '../auth/guards/shop-member.guard';
import { ShopOwnerGuard } from '../auth/guards/shop-owner.guard';
import { UserRole, BookingStatus, DayOfWeek } from '@prisma/client';
import { CreateWalkInDto } from './dto/create-walk-in.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateOwnerShopSettingsDto } from './dto/update-owner-shop-settings.dto';
import { UpdateOwnerPayoutDto } from './dto/update-owner-payout.dto';
import { CreateStaffHierarchyDto } from './dto/create-staff-hierarchy.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';
import { ReassignStaffManagerDto } from './dto/reassign-staff-manager.dto';
import { SetStaffCommissionDto } from './dto/set-staff-commission.dto';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { UpdateStaffBankDetailsDto } from './dto/update-staff-bank-details.dto';
import { UpdateStaffOwnScheduleDto } from './dto/update-staff-own-schedule.dto';
import { RequestStaffTimeOffDto } from './dto/request-staff-time-off.dto';
import { UpdateStaffTimeOffDto } from './dto/update-staff-time-off.dto';
import { UpdateOwnBookingStatusDto } from './dto/update-own-booking-status.dto';

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

  @Get('owner/my-shop')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current owner primary shop details' })
  async getOwnerMyShop(
    @CurrentUser('id') ownerId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.adminService.getOwnerMyShop(ownerId, tenantId, role);
  }

  @Get('shops/:shopId/dashboard')
  @UseGuards(ShopMemberGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop dashboard data' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getDashboard(@Param('shopId') shopId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getDashboard(shopId, tenantId);
  }

  @Get('shops/:shopId/bookings')
  @UseGuards(ShopMemberGuard)
  @ShopIdParam('shopId')
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: BookingStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getBookings(shopId, tenantId, {
      date,
      startDate,
      endDate,
      status,
      page,
      limit,
    });
  }

  @Get('bookings')
  @UseGuards(ShopMemberGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop bookings by query parameter' })
  @ApiQuery({ name: 'shopId', required: true, description: 'Shop ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'status', enum: BookingStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getBookingsByQuery(
    @Query('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: BookingStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getBookings(shopId, tenantId, {
      date,
      startDate,
      endDate,
      status,
      page,
      limit,
    });
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
    return this.adminService.updateBookingStatus(
      bookingId,
      dto.status,
      tenantId,
      dto.adminNotes,
      dto.proposedStartTime,
      dto.proposedEndTime
    );
  }

  @Post('shops/:shopId/walk-in')
  @UseGuards(ShopMemberGuard)
  @ShopIdParam('shopId')
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
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop staff' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getStaff(@Param('shopId') shopId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getStaff(shopId, tenantId);
  }

  @Post('shops/:shopId/staff')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create staff member' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async createStaff(
    @Param('shopId') shopId: string,
    @Body()
    dto: {
      name: string;
      email?: string;
      phone?: string;
      age?: number;
      password?: string;
      role: string;
      avatarUrl?: string;
    },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.createStaff(shopId, dto, tenantId);
  }

  @Patch('shops/:shopId/staff/:staffId')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update staff member' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  async updateStaff(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Body()
    dto: { name?: string; phone?: string; email?: string; age?: number; role?: string; isActive?: boolean; avatarUrl?: string },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.updateStaff(shopId, staffId, dto, tenantId);
  }

  @Delete('shops/:shopId/staff/:staffId')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
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

  @Patch('shops/:shopId/staff/:staffId/pin')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reset staff 6-digit login PIN' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  async resetStaffPin(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { password?: string },
  ) {
    return this.adminService.resetStaffPin(shopId, staffId, tenantId, dto.password);
  }

  @Get('shops/:shopId/staff/:staffId/services')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get services assigned to a staff member' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  async getStaffServices(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.getStaffServices(shopId, staffId, tenantId);
  }

  @Post('shops/:shopId/staff/:staffId/services/:serviceId')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign a service to a staff member' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  async assignServiceToStaff(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.assignServiceToStaff(shopId, staffId, serviceId, tenantId);
  }

  @Delete('shops/:shopId/staff/:staffId/services/:serviceId')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Unassign a service from a staff member' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  async unassignServiceFromStaff(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.unassignServiceFromStaff(shopId, staffId, serviceId, tenantId);
  }

  @Get('shops/:shopId/staff/:staffId/availability')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
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
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update staff working hours for a day' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  @ApiParam({ name: 'dayOfWeek', enum: DayOfWeek })
  async updateStaffAvailability(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
    @Body()
    dto: {
      startTime?: string;
      endTime?: string;
      intervals?: { start: string; end: string }[];
      isOff?: boolean;
    },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.updateStaffWorkingHours(shopId, staffId, dayOfWeek, dto, tenantId);
  }

  @Post('shops/:shopId/staff/:staffId/time-off')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
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
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
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
  @UseGuards(ShopMemberGuard)
  @ShopIdParam('shopId')
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
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
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
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop settings' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getSettings(@Param('shopId') shopId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getShopSettings(shopId, tenantId);
  }

  @Patch('shops/:shopId/settings')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
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

  @Get('shops/:shopId/payout-details')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get shop payout details' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getPayoutDetails(
    @Param('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.getPayoutDetails(shopId, tenantId);
  }

  @Patch('shops/:shopId/payout-details')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update shop payout details' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async updatePayoutDetails(
    @Param('shopId') shopId: string,
    @Body() payoutDetails: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.updatePayoutDetails(shopId, tenantId, payoutDetails);
  }

  @Patch('owners/shops/:shopId/settings')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Owner: update shop settings' })
  async updateOwnerShopSettings(
    @Param('shopId') shopId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: UpdateOwnerShopSettingsDto,
  ) {
    return this.adminService.updateOwnerShopSettings(shopId, ownerId, dto);
  }

  @Patch('owners/shops/:shopId/payout-settings')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Owner: update payout settings' })
  async updateOwnerPayoutSettings(
    @Param('shopId') shopId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: UpdateOwnerPayoutDto,
  ) {
    return this.adminService.updateOwnerPayoutSettings(shopId, ownerId, dto);
  }

  @Patch('shops/:shopId/review-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Super Admin: update shop review status' })
  async updateShopReviewStatus(
    @Param('shopId') shopId: string,
    @Body() dto: { status: 'PENDING_REVIEW' | 'LIVE' | 'REJECTED'; notes?: string },
  ) {
    return this.adminService.updateShopReviewStatus(shopId, dto.status, dto.notes);
  }

  @Get('owners/shops/:shopId/financials')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Owner: get shop financials' })
  async getOwnerFinancials(
    @Param('shopId') shopId: string,
    @CurrentUser('id') ownerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('breakdown') breakdown?: string,
  ) {
    return this.adminService.getShopFinancials(shopId, ownerId, { startDate, endDate, breakdown });
  }

  @Post('owners/shops/:shopId/staff-hierarchy')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Owner: create/update staff hierarchy' })
  async createStaffHierarchy(
    @Param('shopId') shopId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: CreateStaffHierarchyDto,
  ) {
    return this.adminService.createStaffHierarchy(shopId, ownerId, dto);
  }

  @Patch('owners/shops/:shopId/staff/:staffId/role')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Owner: update staff role' })
  async updateStaffRole(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: UpdateStaffRoleDto,
  ) {
    return this.adminService.updateStaffRole(shopId, staffId, ownerId, dto);
  }

  @Get('owners/shops/:shopId/staff-hierarchy')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Owner: get staff hierarchy' })
  async getStaffHierarchy(
    @Param('shopId') shopId: string,
    @CurrentUser('id') ownerId: string,
  ) {
    return this.adminService.getStaffHierarchy(shopId, ownerId);
  }

  @Patch('owners/shops/:shopId/staff/:staffId/manager')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Owner: reassign staff manager' })
  async reassignStaffManager(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: ReassignStaffManagerDto,
  ) {
    return this.adminService.reassignStaffManager(shopId, staffId, ownerId, dto.managerId);
  }

  @Get('owners/shops/:shopId/staff/:staffId/earnings')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Owner: get staff earnings' })
  async getStaffEarnings(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') ownerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('breakdown') breakdown?: string,
  ) {
    return this.adminService.getStaffEarnings(shopId, staffId, ownerId, {
      startDate,
      endDate,
      breakdown,
    });
  }

  @Patch('owners/shops/:shopId/staff/:staffId/commission')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Owner: set staff commission' })
  async setStaffCommission(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') ownerId: string,
    @Body() dto: SetStaffCommissionDto,
  ) {
    return this.adminService.setStaffCommission(shopId, staffId, ownerId, dto);
  }

  @Get('staff/me')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: get own profile' })
  async getStaffMe(@CurrentUser('id') userId: string) {
    return this.adminService.getStaffProfile(userId);
  }

  @Patch('staff/me')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: update own profile' })
  async updateStaffMe(@CurrentUser('id') userId: string, @Body() dto: UpdateStaffProfileDto) {
    return this.adminService.updateStaffProfile(userId, dto);
  }

  @Patch('staff/me/bank-details')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: update own bank details' })
  async updateStaffBankDetails(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStaffBankDetailsDto,
  ) {
    return this.adminService.updateStaffBankDetails(userId, dto);
  }

  @Get('staff/me/schedule')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: get own schedule' })
  async getStaffOwnSchedule(@CurrentUser('id') userId: string) {
    return this.adminService.getStaffOwnSchedule(userId);
  }

  @Patch('staff/me/schedule/:dayOfWeek')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: update own schedule day' })
  async updateStaffOwnSchedule(
    @CurrentUser('id') userId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
    @Body() dto: UpdateStaffOwnScheduleDto,
  ) {
    return this.adminService.updateStaffOwnSchedule(userId, dayOfWeek, dto);
  }

  @Post('staff/me/time-off')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: request time-off' })
  async requestStaffTimeOff(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestStaffTimeOffDto,
  ) {
    return this.adminService.requestStaffTimeOff(userId, dto);
  }

  @Patch('staff/me/time-off/:timeOffId')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: update own time-off request' })
  async updateStaffTimeOff(
    @CurrentUser('id') userId: string,
    @Param('timeOffId') timeOffId: string,
    @Body() dto: UpdateStaffTimeOffDto,
  ) {
    return this.adminService.updateStaffTimeOff(userId, timeOffId, dto);
  }

  @Delete('staff/me/time-off/:timeOffId')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: delete own time-off request' })
  async deleteStaffTimeOffSelf(
    @CurrentUser('id') userId: string,
    @Param('timeOffId') timeOffId: string,
  ) {
    return this.adminService.deleteStaffTimeOffSelf(userId, timeOffId);
  }

  @Get('staff/me/bookings')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: get own bookings' })
  async getStaffOwnBookings(
    @CurrentUser('id') userId: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: BookingStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getStaffOwnBookings(userId, {
      date,
      startDate,
      endDate,
      status,
      page,
      limit,
    });
  }

  @Patch('staff/me/bookings/:bookingId/status')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: update own booking status' })
  async updateStaffOwnBookingStatus(
    @CurrentUser('id') userId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateOwnBookingStatusDto,
  ) {
    return this.adminService.updateStaffOwnBookingStatus(userId, bookingId, dto);
  }

  @Get('staff/me/services')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: get assigned services' })
  async getStaffAssignedServices(@CurrentUser('id') userId: string) {
    return this.adminService.getStaffAssignedServices(userId);
  }

  @Get('staff/me/earnings')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: get own earnings' })
  async getStaffOwnEarnings(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('breakdown') breakdown?: string,
  ) {
    return this.adminService.getStaffOwnEarnings(userId, { startDate, endDate, breakdown });
  }

  @Get('staff/me/payout-history')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: get own payout history' })
  async getStaffPayoutHistory(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getStaffPayoutHistory(userId, { startDate, endDate });
  }

  @Get('staff/me/reviews')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff: get own reviews' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  @ApiQuery({ name: 'withComment', required: false, type: Boolean })
  @ApiQuery({ name: 'unanswered', required: false, type: Boolean })
  async getStaffOwnReviews(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('rating') rating?: number,
    @Query('withComment') withComment?: string | boolean,
    @Query('unanswered') unanswered?: string | boolean,
  ) {
    const toBool = (value?: string | boolean) => value === true || value === 'true';

    return this.adminService.getStaffOwnReviews(userId, {
      page,
      limit,
      rating: rating ? Number(rating) : undefined,
      withComment: toBool(withComment),
      unanswered: toBool(unanswered),
    });
  }

  @Get('users')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get users for fraud monitoring' })
  @ApiQuery({ name: 'fraudScore_gt', type: Number, required: false })
  async getUsers(@Query('fraudScore_gt') fraudScore_gt?: string) {
    // Only fetch users who booked with this tenant, or globally if superadmin
    return this.adminService.getUsers(fraudScore_gt ? Number(fraudScore_gt) : undefined);
  }

  @Patch('users/:id/suspend')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async suspendUser(@Param('id') userId: string, @Body('isSuspended') isSuspended: boolean) {
    return this.adminService.suspendUser(userId, isSuspended);
  }
}
