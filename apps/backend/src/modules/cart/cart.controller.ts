import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  async getCart(@CurrentUser('id') userId: string) {
    const cart = await this.cartService.getCart(userId);
    if (!cart) {
      return { shopId: null, items: [], updatedAt: null };
    }
    return cart;
  }

  @Post()
  @ApiOperation({ summary: 'Set/Update entire cart (replaces current shop items)' })
  @HttpCode(HttpStatus.OK)
  async updateCart(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.updateCart(userId, dto);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add items to cart (merges or replaces if shop changes)' })
  async addToCart(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.mergeCart(userId, dto.shopId, dto.items);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
