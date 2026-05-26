import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding demo shops to delete...');
  
  // Find shops in Mumbai or Delhi, or specifically named "StyleCuts" or "HealthFirst"
  const shopsToDelete = await prisma.shop.findMany({
    where: {
      OR: [
        { city: { contains: 'Mumbai', mode: 'insensitive' } },
        { city: { contains: 'Delhi', mode: 'insensitive' } },
        { name: { contains: 'StyleCuts', mode: 'insensitive' } },
        { name: { contains: 'HealthFirst', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, city: true },
  });

  if (shopsToDelete.length === 0) {
    console.log('No demo shops found.');
    return;
  }

  console.log(`Found ${shopsToDelete.length} shops to delete:`, shopsToDelete.map(s => s.name));

  for (const shop of shopsToDelete) {
    console.log(`Deleting shop: ${shop.name} (${shop.id})`);
    
    // The schema usually relies on onDelete: Cascade for relations like Staff, Service, Booking, etc.
    // If not, we might need to delete them manually. Let's try deleting the shop directly first.
    try {
      await prisma.shop.delete({
        where: { id: shop.id },
      });
      console.log(`Successfully deleted ${shop.name}`);
    } catch (error) {
      console.error(`Failed to delete ${shop.name}:`, error);
      // Let's delete related entities if cascade is not set up
      console.log(`Attempting manual relation cleanup for ${shop.name}...`);
      await prisma.earning.deleteMany({ where: { shopId: shop.id } });
      await prisma.payment.deleteMany({ where: { booking: { shopId: shop.id } } });
      await prisma.bookingService.deleteMany({ where: { booking: { shopId: shop.id } } });
      await prisma.booking.deleteMany({ where: { shopId: shop.id } });
      await prisma.review.deleteMany({ where: { shopId: shop.id } });
      await prisma.queueStats.deleteMany({ where: { shopId: shop.id } });
      await prisma.dailyAnalytics.deleteMany({ where: { shopId: shop.id } });
      await prisma.workingHours.deleteMany({ where: { shopId: shop.id } });
      await prisma.specialSchedule.deleteMany({ where: { shopId: shop.id } });
      
      // Let Cascade handle StaffProfile and related, if it fails we'll add them
      await prisma.staff.deleteMany({ where: { shopId: shop.id } });
      
      await prisma.service.deleteMany({ where: { shopId: shop.id } });
      await prisma.shop.delete({ where: { id: shop.id } });
      console.log(`Successfully deleted ${shop.name} after manual cleanup`);
    }
  }

  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
