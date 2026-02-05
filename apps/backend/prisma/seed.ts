import { PrismaClient, UserRole, TenantType, DayOfWeek } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@overline.app' },
    update: {},
    create: {
      email: 'admin@overline.app',
      name: 'Super Admin',
      hashedPassword,
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // Create Demo Tenant - Salon
  const salonTenant = await prisma.tenant.upsert({
    where: { id: 'demo-salon-tenant' },
    update: {},
    create: {
      id: 'demo-salon-tenant',
      name: 'StyleCuts Salon',
      type: TenantType.SALON,
    },
  });
  console.log('✅ Salon Tenant created:', salonTenant.name);

  // Create Demo Shop - Salon
  const salon = await prisma.shop.upsert({
    where: { slug: 'stylecuts-salon-mumbai' },
    update: {},
    create: {
      tenantId: salonTenant.id,
      name: 'StyleCuts Salon',
      slug: 'stylecuts-salon-mumbai',
      description: 'Premium hair styling and grooming services in the heart of Mumbai',
      address: '123 Fashion Street, Colaba',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'IN',
      latitude: 18.9217,
      longitude: 72.8330,
      phone: '+91 98765 43210',
      email: 'hello@stylecuts.in',
      maxConcurrentBookings: 3,
      autoAcceptBookings: true,
      settings: {
        allowWalkIns: true,
        requirePaymentUpfront: false,
        reminderMinutesBefore: 60,
      },
    },
  });
  console.log('✅ Salon Shop created:', salon.name);

  // Create Salon Owner
  const salonOwner = await prisma.user.upsert({
    where: { email: 'owner@stylecuts.in' },
    update: {},
    create: {
      email: 'owner@stylecuts.in',
      name: 'Rahul Sharma',
      hashedPassword,
      role: UserRole.OWNER,
      tenantId: salonTenant.id,
      isEmailVerified: true,
    },
  });
  console.log('✅ Salon Owner created:', salonOwner.email);

  // Create Salon Services
  const salonServices = await Promise.all([
    prisma.service.create({
      data: {
        shopId: salon.id,
        name: 'Haircut - Men',
        description: 'Professional haircut with styling',
        durationMinutes: 30,
        price: 400,
        sortOrder: 1,
      },
    }),
    prisma.service.create({
      data: {
        shopId: salon.id,
        name: 'Haircut - Women',
        description: 'Professional haircut with wash and blow dry',
        durationMinutes: 45,
        price: 800,
        sortOrder: 2,
      },
    }),
    prisma.service.create({
      data: {
        shopId: salon.id,
        name: 'Hair Color',
        description: 'Full hair coloring with premium products',
        durationMinutes: 90,
        price: 2500,
        sortOrder: 3,
      },
    }),
    prisma.service.create({
      data: {
        shopId: salon.id,
        name: 'Beard Trim',
        description: 'Professional beard trimming and shaping',
        durationMinutes: 15,
        price: 200,
        sortOrder: 4,
      },
    }),
    prisma.service.create({
      data: {
        shopId: salon.id,
        name: 'Head Massage',
        description: 'Relaxing head massage with oils',
        durationMinutes: 20,
        price: 300,
        sortOrder: 5,
      },
    }),
  ]);
  console.log('✅ Salon Services created:', salonServices.length);

  // Create Working Hours for Salon
  const weekdays = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
  ];

  for (const day of weekdays) {
    await prisma.workingHours.upsert({
      where: {
        shopId_dayOfWeek: { shopId: salon.id, dayOfWeek: day },
      },
      update: {},
      create: {
        shopId: salon.id,
        dayOfWeek: day,
        openTime: '10:00',
        closeTime: '20:00',
        breakWindows: [{ start: '14:00', end: '15:00' }],
      },
    });
  }

  await prisma.workingHours.upsert({
    where: {
      shopId_dayOfWeek: { shopId: salon.id, dayOfWeek: DayOfWeek.SATURDAY },
    },
    update: {},
    create: {
      shopId: salon.id,
      dayOfWeek: DayOfWeek.SATURDAY,
      openTime: '09:00',
      closeTime: '21:00',
      breakWindows: [],
    },
  });

  await prisma.workingHours.upsert({
    where: {
      shopId_dayOfWeek: { shopId: salon.id, dayOfWeek: DayOfWeek.SUNDAY },
    },
    update: {},
    create: {
      shopId: salon.id,
      dayOfWeek: DayOfWeek.SUNDAY,
      openTime: '10:00',
      closeTime: '18:00',
      isClosed: false,
      breakWindows: [],
    },
  });
  console.log('✅ Working Hours created for salon');

  // Create Staff for Salon
  const staff = await Promise.all([
    prisma.staff.create({
      data: {
        shopId: salon.id,
        name: 'Amit Kumar',
        phone: '+91 98765 11111',
        role: 'senior_stylist',
      },
    }),
    prisma.staff.create({
      data: {
        shopId: salon.id,
        name: 'Priya Patel',
        phone: '+91 98765 22222',
        role: 'stylist',
      },
    }),
    prisma.staff.create({
      data: {
        shopId: salon.id,
        name: 'Vikram Singh',
        phone: '+91 98765 33333',
        role: 'junior_stylist',
      },
    }),
  ]);
  console.log('✅ Staff created:', staff.length);

  // Create Demo Tenant - Clinic
  const clinicTenant = await prisma.tenant.upsert({
    where: { id: 'demo-clinic-tenant' },
    update: {},
    create: {
      id: 'demo-clinic-tenant',
      name: 'HealthFirst Clinic',
      type: TenantType.CLINIC,
    },
  });
  console.log('✅ Clinic Tenant created:', clinicTenant.name);

  // Create Demo Shop - Clinic
  const clinic = await prisma.shop.upsert({
    where: { slug: 'healthfirst-clinic-delhi' },
    update: {},
    create: {
      tenantId: clinicTenant.id,
      name: 'HealthFirst Clinic',
      slug: 'healthfirst-clinic-delhi',
      description: 'Multi-specialty clinic providing quality healthcare services',
      address: '456 Healthcare Avenue, Connaught Place',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'IN',
      latitude: 28.6315,
      longitude: 77.2167,
      phone: '+91 11 2345 6789',
      email: 'info@healthfirst.in',
      maxConcurrentBookings: 5,
      autoAcceptBookings: false,
      settings: {
        allowWalkIns: true,
        requirePaymentUpfront: false,
        reminderMinutesBefore: 120,
      },
    },
  });
  console.log('✅ Clinic Shop created:', clinic.name);

  // Create Clinic Services
  const clinicServices = await Promise.all([
    prisma.service.create({
      data: {
        shopId: clinic.id,
        name: 'General Consultation',
        description: 'General health check-up and consultation',
        durationMinutes: 15,
        price: 500,
        sortOrder: 1,
      },
    }),
    prisma.service.create({
      data: {
        shopId: clinic.id,
        name: 'Follow-up Visit',
        description: 'Follow-up consultation for existing patients',
        durationMinutes: 10,
        price: 300,
        sortOrder: 2,
      },
    }),
    prisma.service.create({
      data: {
        shopId: clinic.id,
        name: 'Health Checkup Package',
        description: 'Comprehensive health screening with blood tests',
        durationMinutes: 45,
        price: 2500,
        sortOrder: 3,
      },
    }),
    prisma.service.create({
      data: {
        shopId: clinic.id,
        name: 'Vaccination',
        description: 'Various vaccination services',
        durationMinutes: 15,
        price: 800,
        sortOrder: 4,
      },
    }),
  ]);
  console.log('✅ Clinic Services created:', clinicServices.length);

  // Create Queue Stats for shops
  await prisma.queueStats.upsert({
    where: { shopId: salon.id },
    update: {},
    create: {
      shopId: salon.id,
      currentWaitingCount: 0,
      estimatedWaitMinutes: 0,
    },
  });

  await prisma.queueStats.upsert({
    where: { shopId: clinic.id },
    update: {},
    create: {
      shopId: clinic.id,
      currentWaitingCount: 0,
      estimatedWaitMinutes: 0,
    },
  });
  console.log('✅ Queue Stats initialized');

  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'user@demo.com' },
    update: {},
    create: {
      email: 'user@demo.com',
      name: 'Demo User',
      phone: '+91 99999 00000',
      hashedPassword,
      role: UserRole.USER,
      isEmailVerified: true,
    },
  });
  console.log('✅ Demo User created:', demoUser.email);

  console.log('\n🎉 Database seeding completed!');
  console.log('\n📧 Demo Accounts:');
  console.log('  Super Admin: admin@overline.app / admin123');
  console.log('  Salon Owner: owner@stylecuts.in / admin123');
  console.log('  Demo User: user@demo.com / admin123');
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
