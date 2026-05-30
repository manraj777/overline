import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = '916261543983.1777754036087@phone.overline.app';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({
    where: { email },
    data: { hashedPassword }
  });

  console.log(`Successfully updated password for ${email}. New hash: ${updated.hashedPassword}`);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
