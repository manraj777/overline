import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test/booking-confirmation')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test booking confirmation notification' })
  async testBookingConfirmation(@Body() body: { bookingId: string }) {
    await this.notificationsService.sendBookingConfirmation(body.bookingId);
    return { message: 'Notification sent' };
  }

  @Post('test/booking-reminder')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test booking reminder notification' })
  async testBookingReminder(@Body() body: { bookingId: string }) {
    await this.notificationsService.sendBookingReminder(body.bookingId);
    return { message: 'Notification sent' };
  }
}
