import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AuthService } from './src/modules/auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  
  try {
    const res = await authService.registerShop({
      email: `owner_${Date.now()}@test.com`,
      password: 'Password123',
      ownerName: 'Test Owner',
      shopName: 'Test E2E Shop',
      shopType: 'SALON' as any,
      latitude: 19.076,
      longitude: 72.8777,
      address: '123 E2E Road',
      city: 'Mumbai',
      phoneVerified: true,
      emailVerified: true,
    });
    console.log('Success:', res);
  } catch (err) {
    console.error('FAILED WITH ERROR:', err);
  }
  
  await app.close();
}
bootstrap();
