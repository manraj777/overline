import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const shop = await prisma.shop.findUnique({
    where: { slug: 'demo-churhat' }
  });
  if (!shop) {
    console.error('Shop demo-churhat not found!');
    return;
  }
  console.log(`Shop: ${shop.name} (${shop.id}), TenantId: ${shop.tenantId}`);

  const users = await prisma.user.findMany({
    where: { tenantId: shop.tenantId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      isPhoneVerified: true,
      isActive: true,
    }
  });

  console.log('\nUsers associated with this tenant/shop:');
  for (const u of users) {
    console.log(`- [${u.id}] Email: ${u.email}, Name: ${u.name}, Role: ${u.role}, Phone: ${u.phone} (Verified: ${u.isPhoneVerified}), Active: ${u.isActive}`);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
