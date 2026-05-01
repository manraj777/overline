import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
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

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  const configService = app.get(ConfigService);

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

  const configuredOrigins =
    configService.get<string[]>('cors.origin') || [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://overline.in',
      'https://admin.overline.in',
    ];
  const allowedOrigins = new Set(configuredOrigins.flatMap(expandOrigin));

  // Strict CORS allow-list for production domains with localhost support in dev.
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin as string | undefined;
    const isAllowed = origin && (allowedOrigins.has('*') || allowedOrigins.has(origin.replace(/\/$/, '')));

    if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With, Cache-Control, Pragma');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    // Explicitly handle preflight OPTIONS checks to immediately return 204
    if (req.method === 'OPTIONS') {
      if (!origin || isAllowed) {
        res.status(204).end();
        return;
      }
      res.status(403).json({ message: 'Not allowed by CORS' });
      return;
    }

    if (origin && !isAllowed) {
      res.status(403).json({ message: 'Not allowed by CORS' });
      return;
    }

    next();
  });

  // Raw body middleware for Stripe webhooks
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

  // Serve local uploads when filesystem storage is enabled
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  // Root health check endpoint (bypasses global prefix)
  app.getHttpAdapter().get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Welcome to Overline API', timestamp: new Date().toISOString() });
  });

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

  // Only expose Swagger outside production, or when explicitly enabled via env.
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Overline API is running on port ${port}`);
  console.log(`📚 API Documentation: /docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
