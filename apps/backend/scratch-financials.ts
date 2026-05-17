import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shopId = "20f1b9bd-988e-4e57-a6ba-dffb36fb9e8d";
  try {
    const payments = await prisma.payment.findMany({
      where: {
        booking: { shopId },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    console.log("Payments:", payments.length);

    const completedBookings = await prisma.booking.findMany({
      where: {
        shopId,
        status: 'COMPLETED',
      },
      select: {
        id: true,
        totalAmount: true,
        completedAt: true,
      },
    });
    console.log("Completed Bookings:", completedBookings.length);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
