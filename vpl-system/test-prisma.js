import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 5 });
  console.log('Users:', users);
}

main()
  .catch(e => console.error('Prisma error', e))
  .finally(async () => await prisma.$disconnect());
