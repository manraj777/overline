const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const shop = await prisma.shop.findFirst({ where: { slug: 'demo' } });
    console.log("Shop ID:", shop.id);
    const slots = await prisma.timeSlot.findMany({
        where: { shopId: shop.id },
        take: 5
    });
    console.log("Slots count:", slots.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
