import { PrismaClient } from '@prisma/client';
import { SlotEngineService } from './src/modules/queue/slot-engine.service';
import { RedisService } from './src/common/redis/redis.service';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Initializing test slots...');
  const configService = new ConfigService({
    redis: {
      url: process.env.REDIS_URL || "rediss://default:gQAAAAAAAYF-AAIncDJkZDRmMWI1YjgzOTE0ZTUyYWQxNGFkMGUwMTcyYzQ2NHAyOTg2ODY@actual-gar-98686.upstash.io:6379"
    }
  });
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();
  
  const slotEngine = new SlotEngineService(prisma as any, redisService);
  
  const shopId = '8fb91e58-df20-4080-93d0-4ce9a3eb8bc1';
  const serviceId = 'a97e7c2d-57a7-4adf-96aa-eadef6e58e29';
  const staff1 = 'ee0438a6-3318-456f-b268-ccf0d9a71069'; // Ramesh
  const staff2 = 'b05cf9ac-610d-4da9-9005-b373dda41f26'; // Suresh

  const dates = ['2026-05-28', '2026-05-29'];

  for (const date of dates) {
    console.log(`\n=================== TESTING DATE: ${date} ===================`);
    
    // Test 1: Any Staff
    try {
      const slots = await slotEngine.getAvailableSlots({
        shopId,
        date,
        serviceIds: [serviceId]
      });
      console.log(`[Any Staff] slots count:`, slots.length);
      if (slots.length > 0) {
        console.log(`First 3 slots:`, slots.slice(0, 3));
      }
    } catch (err) {
      console.error(`[Any Staff] Error:`, err);
    }

    // Test 2: Ramesh Kumar
    try {
      const slots = await slotEngine.getAvailableSlots({
        shopId,
        date,
        serviceIds: [serviceId],
        staffId: staff1
      });
      console.log(`[Ramesh Kumar] slots count:`, slots.length);
      if (slots.length > 0) {
        console.log(`First 3 slots:`, slots.slice(0, 3));
      }
    } catch (err) {
      console.error(`[Ramesh Kumar] Error:`, err);
    }

    // Test 3: Suresh Singh
    try {
      const slots = await slotEngine.getAvailableSlots({
        shopId,
        date,
        serviceIds: [serviceId],
        staffId: staff2
      });
      console.log(`[Suresh Singh] slots count:`, slots.length);
      if (slots.length > 0) {
        console.log(`First 3 slots:`, slots.slice(0, 3));
      }
    } catch (err) {
      console.error(`[Suresh Singh] Error:`, err);
    }
  }
  
  await redisService.onModuleDestroy();
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
