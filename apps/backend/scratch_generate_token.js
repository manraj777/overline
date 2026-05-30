const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const JWT_SECRET = 'd48b90d95c5693b3cfa0ba77684599234aad94753b50ca98dc25c48d7fd15e7a';

const decodeJwtSecret = (secret) => {
  return Buffer.from(secret, 'base64');
};

async function main() {
  const shop = await prisma.shop.findFirst({
    include: {
      owner: true,
    }
  });

  if (!shop || !shop.owner) {
    console.error('No shop or owner found!');
    process.exit(1);
  }

  const payload = {
    sub: shop.owner.id,
    phone: shop.owner.phone,
    role: shop.owner.role,
  };

  const secret = decodeJwtSecret(JWT_SECRET);
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });

  const authStorage = {
    state: {
      user: shop.owner,
      accessToken: token,
      refreshToken: token,
      shopId: shop.id,
      otpPhone: null,
      pendingOtpVerification: false,
      isAuthenticated: true
    },
    version: 0
  };

  console.log(JSON.stringify(authStorage));
}

main().catch(console.error).finally(() => prisma.$disconnect());
