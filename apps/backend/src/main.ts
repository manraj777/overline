import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './filters/sentry-exception.filter';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  // Sentry initialization (only if DSN is configured)
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      });
      console.log('🛡️  Sentry initialized');
    } catch {
      console.log('⚠️  Sentry not available — skipping error tracking');
    }
  }

  const app = await NestFactory.create(AppModule, {
    // Preserve raw body for Stripe webhook signature verification
    rawBody: true,
  });

  const expandOrigin = (origin: string): string[] => {
    const normalized = origin.trim().replace(/\/$/, '');
    if (!normalized) return [];

    // Keep localhost/http dev origins exactly as provided.
    if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) {
      return [normalized];
    }

    // For production domains, tolerate accidental http:// entries by also allowing https://.
    if (normalized.startsWith('http://')) {
      return [normalized, normalized.replace(/^http:\/\//, 'https://')];
    }

    return [normalized];
  };

  // Completely bulletproof Custom Express CORS Middleware to bypass edge/proxy bugs
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Dynamically reflect the origin, or default to wildcard
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Explicitly handle preflight OPTIONS checks to immediately return 204
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

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

  // Global exception filter (Sentry + structured errors)
  app.useGlobalFilters(new SentryExceptionFilter());

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
