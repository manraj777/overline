import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { SearchShopsDto } from './dto/search-shops.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search and list shops' })
  @ApiResponse({ status: 200, description: 'List of shops matching criteria' })
  async search(@Query() dto: SearchShopsDto) {
    return this.shopsService.search(dto);
  }

  @Get('cities')
  @Public()
  @ApiOperation({ summary: 'Get list of cities with shops' })
  @ApiResponse({ status: 200, description: 'List of city names' })
  async getCities() {
    return this.shopsService.getCities();
  }

  @Get('nearby')
  @Public()
  @ApiOperation({ summary: 'Get nearby shops based on coordinates' })
  @ApiQuery({ name: 'latitude', type: Number, required: true })
  @ApiQuery({ name: 'longitude', type: Number, required: true })
  @ApiQuery({ name: 'radiusKm', type: Number, required: false })
  async getNearby(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radiusKm') radiusKm?: number,
  ) {
    return this.shopsService.getNearbyShops(latitude, longitude, radiusKm);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get shop details by slug' })
  @ApiParam({ name: 'slug', description: 'Shop URL slug' })
  @ApiResponse({ status: 200, description: 'Shop details with services and queue stats' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.shopsService.findBySlug(slug);
  }

  @Get(':id/services')
  @Public()
  @ApiOperation({ summary: 'Get services for a shop' })
  @ApiParam({ name: 'id', description: 'Shop ID' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async getServices(@Param('id') id: string) {
    return this.shopsService.getServices(id);
  }

  @Get(':id/queue')
  @Public()
  @ApiOperation({ summary: 'Get current queue status for a shop' })
  @ApiParam({ name: 'id', description: 'Shop ID' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getQueueStats(@Param('id') id: string) {
    return this.shopsService.getQueueStats(id);
  }
}
