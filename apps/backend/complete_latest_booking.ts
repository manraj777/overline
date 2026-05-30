import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Finding the latest booking in the database...');
  const latest = await prisma.booking.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      shop: true,
      user: true,
    }
  });

  if (!latest) {
    console.error('No bookings found!');
    return;
  }

  console.log(`Found booking: Number: ${latest.bookingNumber}, ID: ${latest.id}, Status: ${latest.status}`);
  console.log(`Shop: ${latest.shop.name}, Customer: ${latest.user?.name || latest.customerName}`);

  const updated = await prisma.booking.update({
    where: { id: latest.id },
    data: { status: 'COMPLETED' }
  });

  console.log(`✅ Updated booking status to: ${updated.status}`);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
