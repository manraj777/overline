import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting cleanup of dummy data...');

  const dummyEmails = [
    'admin@overline.in',
    'owner@stylecuts.in',
    'staff@stylecuts.in',
    'user@demo.com',
  ];

  const dummyTenantIds = [
    'demo-salon-tenant',
    'demo-clinic-tenant',
  ];

  const dummyShopSlugs = [
    'stylecuts-salon-demo',
    'healthfirst-clinic-delhi'
  ];

  // 1. Delete users (which cascade to auth tokens, profiles)
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        in: dummyEmails,
      },
    },
  });
  console.log(`✅ Deleted ${deletedUsers.count} dummy users`);

  // 2. Delete shops by slug (which cascade to services, bookings, staff, working hours)
  const deletedShops = await prisma.shop.deleteMany({
    where: {
      slug: {
        in: dummyShopSlugs,
      },
    },
  });
  console.log(`✅ Deleted ${deletedShops.count} dummy shops`);

  // 3. Delete tenants (which cascade to shops, but we already deleted them to be safe)
  const deletedTenants = await prisma.tenant.deleteMany({
    where: {
      id: {
        in: dummyTenantIds,
      },
    },
  });
  console.log(`✅ Deleted ${deletedTenants.count} dummy tenants`);

  console.log('🎉 Dummy data successfully removed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
