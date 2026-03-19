import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client | null;
  private readonly awsBucket?: string;
  private readonly awsRegion?: string;

  constructor(private configService: ConfigService) {
    this.awsBucket = this.configService.get<string>('AWS_BUCKET');
    this.awsRegion = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_KEY');

    if (this.awsBucket && this.awsRegion && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: this.awsRegion,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('Upload service configured with AWS S3 storage');
    } else {
      this.s3Client = null;
      this.logger.log('Upload service configured with local filesystem storage');
    }
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

    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'overline';
    const extension = file.originalname.includes('.')
      ? file.originalname.split('.').pop()?.toLowerCase()
      : 'jpg';
    const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    const objectKey = `${safeFolder}/${fileName}`;

    if (this.s3Client && this.awsBucket && this.awsRegion) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.awsBucket,
            Key: objectKey,
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        );

        return {
          url: `https://${this.awsBucket}.s3.${this.awsRegion}.amazonaws.com/${objectKey}`,
          publicId: objectKey,
        };
      } catch (error) {
        this.logger.error('S3 upload failed', error as Error);
        throw new BadRequestException('Failed to upload image to S3');
      }
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeFolder);
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, file.buffer);

    return {
      url: `/public/uploads/${safeFolder}/${fileName}`,
      publicId: objectKey,
    };
  }

  async deleteImage(_publicId: string): Promise<void> {
    return;
  }
}
