import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly isCloudinaryConfigured: boolean;
  private readonly uploadTimeoutMs = 30000;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

    if (this.isCloudinaryConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log('Upload service configured with Cloudinary storage');
      return;
    }

    const requireCloudinary = process.env.REQUIRE_CLOUDINARY === 'true';
    if (process.env.NODE_ENV === 'production' && requireCloudinary) {
      throw new Error(
        'Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }

    this.logger.warn(
      'Cloudinary credentials are missing. Upload endpoints are disabled until CLOUDINARY_* variables are set.',
    );
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'overline',
  ): Promise<{ url: string; publicId: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP and GIF images are allowed');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be under 5 MB');
    }

    if (!this.isCloudinaryConfigured) {
      throw new BadRequestException('Image upload is not configured on server');
    }

    const safeFolder =
      folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'overline';
    const extension = file.originalname.includes('.')
      ? file.originalname.split('.').pop()?.toLowerCase()
      : 'jpg';
    const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;

    try {
      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      let uploadResult: { secure_url: string; public_id: string } | null = null;
      let lastError: unknown;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          uploadResult = (await Promise.race([
            cloudinary.uploader.upload(dataUri, {
              folder: safeFolder,
              public_id: fileName.replace(/\.[^.]+$/, ''),
              resource_type: 'image',
              overwrite: false,
            }),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Upload timeout')), this.uploadTimeoutMs);
            }),
          ])) as { secure_url: string; public_id: string };
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            await this.delay(250 * attempt);
          }
        }
      }

      if (!uploadResult) {
        throw lastError;
      }

      return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown upload error';
      this.logger.error(`Cloudinary upload failed: ${message}`, error as Error);
      throw new BadRequestException(
        message === 'Upload timeout' ? 'Upload timed out. Please try again.' : 'Failed to upload image',
      );
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!this.isCloudinaryConfigured || !publicId) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      this.logger.warn(
        `Failed to delete Cloudinary image ${publicId}: ${(error as Error).message}`,
      );
    }
  }
}
