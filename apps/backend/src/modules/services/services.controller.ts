import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('services')
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post('shop/:shopId')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new service for a shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async create(
    @Param('shopId') shopId: string,
    @Body() dto: CreateServiceDto,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.create(shopId, dto, user);
  }

  @Get('shop/:shopId')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all services for a shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async findByShop(@Param('shopId') shopId: string) {
    return this.servicesService.findByShop(shopId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get service details' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  async findById(@Param('id') id: string) {
    return this.servicesService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete (deactivate) a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.delete(id, user);
  }

  @Patch('shop/:shopId/reorder')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reorder services for a shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async reorder(
    @Param('shopId') shopId: string,
    @Body() body: { serviceIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.servicesService.reorder(shopId, body.serviceIds, user);
  }
}
