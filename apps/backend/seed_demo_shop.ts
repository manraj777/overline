import { PrismaClient, DayOfWeek } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo-churhat shop details...');

  const shop = await prisma.shop.findUnique({
    where: { slug: 'demo-churhat' }
  });

  if (!shop) {
    console.error('demo-churhat shop not found!');
    return;
  }

  console.log('Found shop:', shop.name, shop.id);

  // 1. Create Working Hours for all days of the week
  const days = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
  ];

  for (const day of days) {
    await prisma.workingHours.upsert({
      where: {
        shopId_dayOfWeek: { shopId: shop.id, dayOfWeek: day }
      },
      update: {
        openTime: '08:00',
        closeTime: '23:00',
        isClosed: false,
        breakWindows: [],
      },
      create: {
        shopId: shop.id,
        dayOfWeek: day,
        openTime: '08:00',
        closeTime: '23:00',
        isClosed: false,
        breakWindows: [],
      }
    });
  }
  console.log('✅ Working Hours seeded (08:00 - 23:00, OPEN)');

  // 2. Create Services
  const servicesData = [
    { name: 'Classic Haircut', description: 'Standard men haircut & trim', durationMinutes: 30, price: 150, category: 'Hair Services' },
    { name: 'Beard Grooming', description: 'Beard trim, shape & hot towel massage', durationMinutes: 20, price: 100, category: 'Hair Services' },
    { name: 'Premium Hair Color', description: 'Loreal hair coloring with wash', durationMinutes: 45, price: 400, category: 'Coloring' },
    { name: 'De-Tan Facial', description: 'Skin brightening facial & cleanup', durationMinutes: 30, price: 250, category: 'Facials' },
  ];

  // Clear existing services if any
  await prisma.service.deleteMany({ where: { shopId: shop.id } });

  const services = [];
  for (const sd of servicesData) {
    const srv = await prisma.service.create({
      data: {
        shopId: shop.id,
        name: sd.name,
        description: sd.description,
        durationMinutes: sd.durationMinutes,
        price: sd.price,
        category: sd.category,
        isApproved: true,
        isActive: true,
      }
    });
    services.push(srv);
  }
  console.log(`✅ Created ${services.length} services`);

  // 3. Create Staff
  await prisma.staff.deleteMany({ where: { shopId: shop.id } });

  const staff1 = await prisma.staff.create({
    data: {
      shopId: shop.id,
      name: 'Ramesh Kumar',
      role: 'Senior Stylist',
      phone: '+91 99999 11111',
      isActive: true,
    }
  });

  const staff2 = await prisma.staff.create({
    data: {
      shopId: shop.id,
      name: 'Suresh Singh',
      role: 'Barber Professional',
      phone: '+91 99999 22222',
      isActive: true,
    }
  });
  console.log('✅ Created staff Ramesh Kumar & Suresh Singh');

  // Link staff to all seeded services
  for (const srv of services) {
    await prisma.staffService.create({
      data: {
        staffId: staff1.id,
        serviceId: srv.id,
      }
    });
    await prisma.staffService.create({
      data: {
        staffId: staff2.id,
        serviceId: srv.id,
      }
    });
  }
  console.log('✅ Linked staff Ramesh Kumar & Suresh Singh to all services');

  // Set up staff working hours
  for (const day of days) {
    await prisma.staffWorkingHours.create({
      data: {
        staffId: staff1.id,
        dayOfWeek: day,
        intervals: [{ start: '08:00', end: '23:00' }],
        isOff: false,
      }
    });
    await prisma.staffWorkingHours.create({
      data: {
        staffId: staff2.id,
        dayOfWeek: day,
        intervals: [{ start: '08:00', end: '23:00' }],
        isOff: false,
      }
    });
  }
  console.log('✅ Created staff working hours (08:00 - 23:00) for all days');

  // Let's create user & staff profile if needed (for staff timeline visualizer and booking engine)
  // Let's see if we need a staff profile for staff1
  const ownerUser = await prisma.user.findFirst({
    where: { role: 'OWNER', tenantId: shop.tenantId }
  });

  if (ownerUser) {
    const profile = await prisma.staffProfile.upsert({
      where: { userId: ownerUser.id },
      update: {
        shopId: shop.id,
        displayName: ownerUser.name,
        isActive: true,
      },
      create: {
        userId: ownerUser.id,
        shopId: shop.id,
        displayName: ownerUser.name,
        isActive: true,
      }
    });
    console.log('✅ Staff profile mapped to owner:', ownerUser.email);
  }

  // Initialise queueStats if they don't exist
  await prisma.queueStats.upsert({
    where: { shopId: shop.id },
    update: {
      currentWaitingCount: 0,
      estimatedWaitMinutes: 0,
    },
    create: {
      shopId: shop.id,
      currentWaitingCount: 0,
      estimatedWaitMinutes: 0,
    }
  });
  console.log('✅ Queue stats initialised');

  console.log('Demo shop seeding complete!');
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
