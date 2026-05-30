import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying Database...');
  const shops = await prisma.shop.findMany({
    include: {
      services: true,
      staff: true,
    }
  });
  console.log(`Found ${shops.length} shops:`);
  for (const s of shops) {
    console.log(`- Shop: [${s.id}] Name: "${s.name}" Slug: "${s.slug}"`);
    console.log(`  Services: ${s.services.length}`);
    for (const srv of s.services) {
      console.log(`    - [${srv.id}] "${srv.name}" - ₹${srv.price} (${srv.isApproved ? 'Approved' : 'Pending'})`);
    }
    console.log(`  Staff: ${s.staff.length}`);
    for (const st of s.staff) {
      console.log(`    - [${st.id}] "${st.name}" - Role: ${st.role}`);
    }
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
