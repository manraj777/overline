const resolveDatabaseUrl = (): string | undefined => {
  const directUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRESQL_URL ||
    process.env.PG_URL;

  if (directUrl) {
    return directUrl;
  }

  const host = process.env.PGHOST;
  const port = process.env.PGPORT || '5432';
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (host && user && password && database) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    const encodedDatabase = encodeURIComponent(database);
    return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDatabase}?schema=public`;
  }

  return undefined;
};

const normalizeRedisUrl = (redisUrl?: string): string | undefined => {
  if (!redisUrl) return undefined;

  try {
    const parsed = new URL(redisUrl);

    // Some providers reject AUTH with username "default" and expect password-only auth.
    if (parsed.protocol.startsWith('redis') && parsed.username === 'default') {
      parsed.username = '';
      return parsed.toString();
    }

    return redisUrl;
  } catch {
    return redisUrl;
  }
};

export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  environment: process.env.NODE_ENV || 'development',

  database: {
    url: resolveDatabaseUrl(),
  },

  redis: {
    url: normalizeRedisUrl(process.env.REDIS_URL),
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3002',
    ],
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },

  payments: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET,
    },
  },

  notifications: {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
    fcm: {
      serverKey: process.env.FCM_SERVER_KEY,
    },
    sms: {
      apiKey: process.env.SMS_API_KEY,
    },
  },

  maps: {
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY,
  },

  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',

  frontendUrls: {
    user:
      process.env.USER_WEB_URL ||
      process.env.USER_FRONTEND_URL ||
      process.env.FRONTEND_USER_URL ||
      'http://localhost:3000',
    admin:
      process.env.ADMIN_WEB_URL ||
      process.env.ADMIN_FRONTEND_URL ||
      process.env.FRONTEND_ADMIN_URL ||
      'http://localhost:3002',
  },
});
