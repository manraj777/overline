const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'user@demo.com' } });
  console.log(user);
}
main().finally(() => prisma.$disconnect());
