import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Preserve raw body for Stripe webhook signature verification
    rawBody: true,
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3002',
    ],
    credentials: true,
  });

  // WebSocket adapter (Socket.IO)
  app.useWebSocketAdapter(new IoAdapter(app));

  // Raw body middleware for Stripe webhooks
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

  // Serve local uploads when filesystem storage is enabled
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  // Global prefix
  app.setGlobalPrefix('api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Overline API')
    .setDescription('Multi-tenant Appointment & Queue Management System API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('shops', 'Shop discovery and details')
    .addTag('services', 'Service management')
    .addTag('bookings', 'Booking management')
    .addTag('queue', 'Queue and slot management')
    .addTag('admin', 'Admin management endpoints')
    .addTag('payments', 'Payment processing')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Overline API is running on port ${port}`);
  console.log(`📚 API Documentation: /docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
