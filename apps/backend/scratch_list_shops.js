const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const shops = await prisma.shop.findMany({ select: { slug: true, name: true } });
  console.log('Available shops:', shops);
  process.exit(0);
})();
