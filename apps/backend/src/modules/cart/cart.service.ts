import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { AddToCartDto } from './dto/cart.dto';

export interface Cart {
  shopId: string;
  items: Array<{
    serviceId: string;
    staffId?: string;
  }>;
  updatedAt: number;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  private readonly CART_PREFIX = 'cart:';
  private readonly CART_TTL = 86400; // 24 hours

  constructor(private readonly redis: RedisService) {}

  async getCart(userId: string): Promise<Cart | null> {
    const key = `${this.CART_PREFIX}${userId}`;
    return this.redis.getJson<Cart>(key);
  }

  async updateCart(userId: string, dto: AddToCartDto): Promise<Cart> {
    const key = `${this.CART_PREFIX}${userId}`;
    const cart: Cart = {
      shopId: dto.shopId,
      items: dto.items,
      updatedAt: Date.now(),
    };

    await this.redis.setJson(key, cart, this.CART_TTL);
    return cart;
  }

  async clearCart(userId: string): Promise<void> {
    const key = `${this.CART_PREFIX}${userId}`;
    await this.redis.del(key);
  }

  async mergeCart(userId: string, shopId: string, items: any[]): Promise<Cart> {
    const currentCart = await this.getCart(userId);
    
    // If shop changed, we replace the cart (standard Zomato behavior)
    if (currentCart && currentCart.shopId !== shopId) {
      return this.updateCart(userId, { shopId, items });
    }

    const mergedItems = currentCart ? [...currentCart.items, ...items] : items;
    // Remove duplicates by serviceId
    const uniqueItems = Array.from(
      new Map(mergedItems.map((item) => [item.serviceId, item])).values(),
    );

    return this.updateCart(userId, { shopId, items: uniqueItems });
  }
}
