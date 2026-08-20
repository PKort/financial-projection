import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { TenantInterceptor } from './tenant.interceptor';
import { ProjectionService } from './projection.service';
import { PrismaService } from './prisma.service';

@Controller('api')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class ProjectionController {
  constructor(
    private readonly projectionService: ProjectionService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('accounts')
  async getAccounts() {
    return this.projectionService.getAllAccounts();
  }

  @Get('transaction-groups')
  async getTransactionGroups() {
    return this.projectionService.getTransactionGroups();
  }

  @Get('admin/transaction-groups')
  async getTransactionGroupsAdmin(@Query('includeInactive') includeInactive?: string) {
    return this.projectionService.getTransactionGroupsAdmin(includeInactive !== 'false');
  }

  @Post('admin/transaction-groups')
  async createTransactionGroup(
    @Body()
    body: {
      code: string;
      name: string;
      sortOrder?: number;
    },
  ) {
    return this.projectionService.createTransactionGroup(body);
  }

  @Patch('admin/transaction-groups/:id')
  async updateTransactionGroup(
    @Param('id') id: string,
    @Body()
    body: {
      code: string;
      name: string;
      sortOrder?: number;
    },
  ) {
    return this.projectionService.updateTransactionGroup(parseInt(id, 10), body);
  }

  @Delete('admin/transaction-groups/:id')
  @HttpCode(204)
  async deactivateTransactionGroup(@Param('id') id: string) {
    await this.projectionService.deactivateTransactionGroup(parseInt(id, 10));
  }
  
  @Post('admin/transaction-subgroups')
  async createTransactionSubgroup(
    @Body()
    body: {
      transactionGroupId: number;
      code: string;
      name: string;
      sortOrder?: number;
    },
  ) {
    return this.projectionService.createTransactionSubgroup(body);
  }

  @Patch('admin/transaction-subgroups/:id')
  async updateTransactionSubgroup(
    @Param('id') id: string,
    @Body()
    body: {
      transactionGroupId: number;
      code: string;
      name: string;
      sortOrder?: number;
    },
  ) {
    return this.projectionService.updateTransactionSubgroup(parseInt(id, 10), body);
  }

  @Delete('admin/transaction-subgroups/:id')
  @HttpCode(204)
  async deactivateTransactionSubgroup(@Param('id') id: string) {
    await this.projectionService.deactivateTransactionSubgroup(parseInt(id, 10));
  }

  @Get('projection-default-range')
  async getProjectionDefaultRange() {
    return this.projectionService.getProjectionDefaultRange();
  }

  @Post('accounts')
  async createAccount(
    @Body()
    body: {
      name: string;
      accountTypeId: number;
      initialBalance?: number;
      includeInDailyBudget?: boolean;
      creditLimit?: number;
      repaymentAccountId?: number | null;
      autoRepaymentEnabled?: boolean;
      autoRepaymentOffsetDays?: number;
      autoRepaymentGroupId?: number | null;
      autoRepaymentSubgroupId?: number | null;
    },
  ) {
    const created = await this.projectionService.createAccount(body);
    return {
      ...created,
      initialBalance: Number(created.initialBalance),
      creditLimit: created.creditLimit != null ? Number(created.creditLimit) : null,
    };
  }

  @Patch('accounts/:id')
  async updateAccount(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      accountTypeId?: number;
      initialBalance?: number;
      includeInDailyBudget?: boolean;
      creditLimit?: number | null;
      repaymentAccountId?: number | null;
      autoRepaymentEnabled?: boolean;
      autoRepaymentOffsetDays?: number;
      autoRepaymentGroupId?: number | null;
      autoRepaymentSubgroupId?: number | null;
    },
  ) {
    const updated = await this.projectionService.updateAccount(parseInt(id, 10), body);
    return {
      ...updated,
      initialBalance: Number(updated.initialBalance),
      creditLimit: updated.creditLimit != null ? Number(updated.creditLimit) : null,
    };
  }

  @Delete('accounts/:id')
  @HttpCode(204)
  async deleteAccount(@Param('id') id: string) {
    await this.projectionService.deleteAccount(parseInt(id, 10));
  }

  @Get('projection')
  async getProjection(@Query('start') start: string, @Query('end') end: string) {
    return this.projectionService.generateProjection(start, end);
  }

  @Post('transactions')
  async createTransaction(
    @Body()
    body: {
      date: string;
      accountId?: number;
      sourceAccountId?: number;
      destinationAccountId?: number;
      info: string;
      income?: number;
      expense?: number;
      type?: string;
      isSalaryIncome?: boolean;
      transactionGroupId?: number | null;
      transactionSubgroupId?: number | null;
    },
  ) {
    const created = await this.projectionService.createTransaction(body);
    return {
      ...created,
      income: Number(created.income || 0),
      expense: Number(created.expense || 0),
    };
  }

  @Patch('transactions/:id')
  async updateTransaction(
    @Param('id') id: string,
    @Body()
    body: {
      date: string;
      accountId?: number;
      sourceAccountId?: number;
      destinationAccountId?: number;
      info: string;
      income?: number;
      expense?: number;
      type?: string;
      isSalaryIncome?: boolean;
      transactionGroupId?: number | null;
      transactionSubgroupId?: number | null;
    },
  ) {
    const updated = await this.projectionService.updateTransaction(parseInt(id, 10), body);
    return {
      ...updated,
      income: Number(updated.income || 0),
      expense: Number(updated.expense || 0),
    };
  }

  @Patch('transactions/:id/toggle-clear')
  async toggleTransactionCleared(@Param('id') id: string) {
    const txId = parseInt(id, 10);
    const transaction = await this.prisma.transaction.findUnique({ where: { id: txId } });

    if (!transaction) {
      throw new Error('Transakcja nie istnieje');
    }

    const updated = await this.prisma.transaction.update({
      where: { id: txId },
      data: { isCleared: !transaction.isCleared },
    });

    return {
      ...updated,
      income: Number(updated.income || 0),
      expense: Number(updated.expense || 0),
    };
  }

  @Delete('transactions/:id')
  @HttpCode(204)
  async deleteTransaction(@Param('id') id: string) {
    await this.projectionService.deleteTransaction(parseInt(id, 10));
  }

  @Get('recurring-templates')
  async getTemplates() {
    const templates = await this.prisma.recurringTemplate.findMany({
      include: {
        account: { select: { name: true } },
        transactionGroup: { select: { id: true, name: true } },
        transactionSubgroup: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });

    return templates.map((t) => ({
      ...t,
      amount: Number(t.amount),
    }));
  }

  @Post('recurring-templates')
  async createTemplate(
    @Body()
    body: {
      accountId: number;
      info: string;
      amount: number;
      startDate: string;
      endDate?: string;
      multiplier?: number;
      period: string;
      dayOfMonth?: number;
      transactionGroupId?: number | null;
      transactionSubgroupId?: number | null;
    },
  ) {
    const created = await this.projectionService.createRecurringTemplate(body);
    return {
      ...created,
      amount: Number(created.amount),
    };
  }

  @Patch('recurring-templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      accountId: number;
      info: string;
      amount: number;
      startDate: string;
      endDate?: string;
      multiplier?: number;
      period: string;
      dayOfMonth?: number;
      isActive?: boolean;
      transactionGroupId?: number | null;
      transactionSubgroupId?: number | null;
    },
  ) {
    const updated = await this.projectionService.updateRecurringTemplate(parseInt(id, 10), body);
    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  @Delete('recurring-templates/:id')
  @HttpCode(204)
  async deleteTemplate(@Param('id') id: string) {
    await this.projectionService.deleteRecurringTemplate(parseInt(id, 10));
  }

  @Get('settings')
  async getSettings() {
    const settings = await this.prisma.globalSettings.findMany();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  @Post('settings')
  async upsertSetting(@Body() body: { key: string; value: string }) {
    const existing = await this.prisma.globalSettings.findFirst({ where: { key: body.key } });
    return existing
      ? this.prisma.globalSettings.update({ where: { id: existing.id }, data: { value: body.value } })
      : this.prisma.globalSettings.create({ data: { userId: 0, key: body.key, value: body.value } });
  }

  @Get('transactions')
  async getTransactions() {
    const transactions = await this.prisma.transaction.findMany({
      include: {
        transactionGroup: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        transactionSubgroup: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });

    return transactions.map((t) => ({
      ...t,
      income: Number(t.income || 0),
      expense: Number(t.expense || 0),
      transactionGroupName: t.transactionGroup?.name ?? null,
      transactionSubgroupName: t.transactionSubgroup?.name ?? null,
    }));
  }
  
}
