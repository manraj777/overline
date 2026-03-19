import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly isCloudinaryConfigured: boolean;

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

    this.logger.warn('Cloudinary credentials are missing');
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

    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'overline';
    const extension = file.originalname.includes('.')
      ? file.originalname.split('.').pop()?.toLowerCase()
      : 'jpg';
    const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;

    try {
      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: safeFolder,
        public_id: fileName.replace(/\.[^.]+$/, ''),
        resource_type: 'image',
        overwrite: false,
      });

      return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      };
    } catch (error) {
      this.logger.error('Cloudinary upload failed', error as Error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!this.isCloudinaryConfigured || !publicId) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      this.logger.warn(`Failed to delete Cloudinary image ${publicId}: ${(error as Error).message}`);
    }
  }
}
