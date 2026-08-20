import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const username = process.env.ADMIN_USERNAME ?? 'admin';
const password = process.env.ADMIN_RESET_PASSWORD;

if (!password || password.length < 8) {
  throw new Error('Ustaw ADMIN_RESET_PASSWORD na nowe hasło mające co najmniej 8 znaków.');
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.role !== 'ADMIN') {
    throw new Error(`Nie znaleziono administratora o nazwie ${username}.`);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12), isActive: true } }),
    prisma.userSession.deleteMany({ where: { userId: user.id } }),
  ]);
  console.log(`Hasło administratora ${username} zostało zmienione. Wszystkie jego sesje unieważniono.`);
}

main().finally(() => prisma.$disconnect());
