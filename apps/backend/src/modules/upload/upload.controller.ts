import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Param,
  Patch,
  Body,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return data ? request.user?.[data] : request.user;
});

@ApiTags('upload')
@Controller({ path: 'upload', version: '1' })
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload a general image (returns URL)
   */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
      },
    },
  })
  async uploadImageRoot(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const result = await this.uploadService.uploadImage(file, folder || 'overline');
    return { url: result.url };
  }

  /**
   * Upload a general video (returns URL)
   */
  @Post('video')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
      },
    },
  })
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const result = await this.uploadService.uploadVideo(file, folder || 'overline');
    return { url: result.url };
  }

  /**
   * Upload a general image (returns URL)
   */
  @Post('image')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
      },
    },
  })
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    const result = await this.uploadService.uploadImage(file, folder || 'overline');
    return { url: result.url };
  }

  /**
   * Public upload for registration flow (no JWT required, rate-limited)
   */
  @Post('register-image')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', description: 'main | cover | gallery' },
      },
    },
  })
  async uploadRegistrationImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type?: string,
  ) {
    const folder = type === 'main' ? 'overline/shops/logos'
      : type === 'cover' ? 'overline/shops/covers'
      : 'overline/shops/gallery';
    const result = await this.uploadService.uploadImage(file, folder);
    return { url: result.url };
  }

  /**
   * Upload shop logo
   */
  @Patch('shop/:shopId/logo')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  async uploadShopLogo(@Param('shopId') shopId: string, @UploadedFile() file: Express.Multer.File) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const result = await this.uploadService.uploadImage(file, 'overline/shops/logos');
    try {
      await this.prisma.shop.update({
        where: { id: shopId },
        data: { logoUrl: result.url },
      });
    } catch (error) {
      await this.uploadService.deleteImage(result.publicId);
      this.logger.error(`Failed to persist uploaded shop logo for ${shopId}`, error as Error);
      throw new InternalServerErrorException('Failed to save uploaded shop logo');
    }

    return { logoUrl: result.url };
  }

  /**
   * Upload shop cover image
   */
  @Patch('shop/:shopId/cover')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  async uploadShopCover(
    @Param('shopId') shopId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const result = await this.uploadService.uploadImage(file, 'overline/shops/covers');
    try {
      await this.prisma.shop.update({
        where: { id: shopId },
        data: { coverUrl: result.url },
      });
    } catch (error) {
      await this.uploadService.deleteImage(result.publicId);
      this.logger.error(`Failed to persist uploaded shop cover for ${shopId}`, error as Error);
      throw new InternalServerErrorException('Failed to save uploaded shop cover');
    }

    return { coverUrl: result.url };
  }

  /**
   * Upload user avatar image
   */
  @Patch('user/avatar')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  async uploadUserAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const result = await this.uploadService.uploadImage(file, 'overline/users/avatars');
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: result.url },
      });
    } catch (error) {
      await this.uploadService.deleteImage(result.publicId);
      this.logger.error(`Failed to persist uploaded avatar for user ${userId}`, error as Error);
      throw new InternalServerErrorException('Failed to save uploaded avatar');
    }

    return { avatarUrl: result.url };
  }
}
