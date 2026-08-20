import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const defaultPasswordHash = await bcrypt.hash('12345678', 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { role: 'ADMIN', isActive: true },
    create: { username: 'admin', passwordHash: defaultPasswordHash, role: 'ADMIN' },
  });
  const piotr = await prisma.user.upsert({
    where: { username: 'piotr.kortyka' },
    update: { role: 'USER', isActive: true },
    create: { username: 'piotr.kortyka', passwordHash: defaultPasswordHash, role: 'USER' },
  });

  await prisma.globalSettings.upsert({
    where: { userId_key: { userId: piotr.id, key: 'daily_budget' } },
    update: { value: '130' },
    create: { userId: piotr.id, key: 'daily_budget', value: '130' },
  });

  await prisma.accountType.upsert({
    where: { code: 'checking' },
    update: { name: 'Rachunek bieżący' },
    create: { code: 'checking', name: 'Rachunek bieżący' },
  });

  await prisma.accountType.upsert({
    where: { code: 'savings' },
    update: { name: 'Oszczędnościowe' },
    create: { code: 'savings', name: 'Oszczędnościowe' },
  });

  await prisma.accountType.upsert({
    where: { code: 'credit_card' },
    update: { name: 'Karta kredytowa' },
    create: { code: 'credit_card', name: 'Karta kredytowa' },
  });

  const groups = [
    {
      code: 'current-expenses',
      name: 'Wydatki bieżące',
      sortOrder: 10,
      isSystem: false,
      subgroups: [
        { code: 'current-expenses-general', name: 'Ogólne', sortOrder: 10, isSystem: false },
      ],
    },
    {
      code: 'home',
      name: 'Dom',
      sortOrder: 20,
      isSystem: false,
      subgroups: [
        { code: 'home-electricity', name: 'Prąd', sortOrder: 10, isSystem: false },
        { code: 'home-internet', name: 'Internet', sortOrder: 20, isSystem: false },
        { code: 'home-gas', name: 'Gaz', sortOrder: 30, isSystem: false },
        { code: 'home-water', name: 'Woda', sortOrder: 40, isSystem: false },
      ],
    },
    {
      code: 'car',
      name: 'Samochód',
      sortOrder: 30,
      isSystem: false,
      subgroups: [
        { code: 'car-insurance', name: 'Ubezpieczenie', sortOrder: 10, isSystem: false },
        { code: 'car-service', name: 'Serwis', sortOrder: 20, isSystem: false },
        { code: 'car-fuel', name: 'Paliwo', sortOrder: 30, isSystem: false },
      ],
    },
    {
      code: 'system',
      name: 'Systemowe',
      sortOrder: 1000,
      isSystem: true,
      subgroups: [
        { code: 'credit-card-repayment', name: 'Spłata karty kredytowej', sortOrder: 10, isSystem: true },
      ],
    },
  ];

  for (const group of groups) {
    const createdGroup = await prisma.transactionGroup.upsert({
      where: { userId_code: { userId: piotr.id, code: group.code } },
      update: {
        name: group.name,
        sortOrder: group.sortOrder,
        isSystem: group.isSystem,
        isActive: true,
      },
      create: {
        userId: piotr.id,
        code: group.code,
        name: group.name,
        sortOrder: group.sortOrder,
        isSystem: group.isSystem,
        isActive: true,
      },
    });

    for (const subgroup of group.subgroups) {
      await prisma.transactionSubgroup.upsert({
        where: { userId_code: { userId: piotr.id, code: subgroup.code } },
        update: {
          transactionGroupId: createdGroup.id,
          name: subgroup.name,
          sortOrder: subgroup.sortOrder,
          isSystem: subgroup.isSystem,
          isActive: true,
        },
        create: {
          userId: piotr.id,
          transactionGroupId: createdGroup.id,
          code: subgroup.code,
          name: subgroup.name,
          sortOrder: subgroup.sortOrder,
          isSystem: subgroup.isSystem,
          isActive: true,
        },
      });
    }
  }

  const existingAccounts = await prisma.account.count({ where: { userId: piotr.id } });

  if (existingAccounts === 0) {
    const [checking, savings, creditCard] = await Promise.all([
      prisma.accountType.findUniqueOrThrow({ where: { code: 'checking' } }),
      prisma.accountType.findUniqueOrThrow({ where: { code: 'savings' } }),
      prisma.accountType.findUniqueOrThrow({ where: { code: 'credit_card' } }),
    ]);

    await prisma.account.createMany({
      data: [
        {
          userId: piotr.id,
          name: 'PKO konto główne',
          accountTypeId: checking.id,
          initialBalance: 0,
          includeInDailyBudget: true,
        },
        {
          userId: piotr.id,
          name: 'Santander oszczędnościowe',
          accountTypeId: savings.id,
          initialBalance: 0,
          includeInDailyBudget: false,
          autoRepaymentEnabled: false,
          autoRepaymentOffsetDays: 1,
        },
        {
          userId: piotr.id,
          name: 'Karta kredytowa',
          accountTypeId: creditCard.id,
          initialBalance: 0,
          includeInDailyBudget: false,
        },
      ],
    });
  }
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
