require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Clearing database...');
  const prisma = new PrismaClient();
  
  try {
    // Delete all users (cascaded automatically to their relations)
    const result = await prisma.user.deleteMany({});
    console.log(`Successfully deleted ${result.count} users.`);
    
    // Optionally delete tenants or shops if needed, but the prompt just asked to clear user db to reuse emails
    // await prisma.tenant.deleteMany({});
  } catch (err) {
    console.error('Failed to clear users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
