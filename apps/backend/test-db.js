const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to Supabase...');
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Successfully connected to Supabase!', result);
  } catch (error) {
    console.error('Failed to connect to Supabase:');
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
