import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private tenantContext: TenantContextService) {
    super();
  }

  async onModuleInit() {
    this.$use(async (params: any, next) => {
      const userId = this.tenantContext.userId;
      const tenantModels = new Set([
        'GlobalSettings',
        'Account',
        'TransactionGroup',
        'TransactionSubgroup',
        'Transaction',
        'RecurringTemplate',
      ]);

      if (!userId || !params.model || !tenantModels.has(params.model)) {
        return next(params);
      }

      params.args ??= {};
      const withUserFilter = (where: any) => ({ AND: [where ?? {}, { userId }] });

      if (params.action === 'create') {
        params.args.data = { ...params.args.data, userId };
      }

      if (params.action === 'createMany') {
        params.args.data = Array.isArray(params.args.data)
          ? params.args.data.map((data: any) => ({ ...data, userId }))
          : { ...params.args.data, userId };
      }

      if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany'].includes(params.action)) {
        params.args.where = withUserFilter(params.args.where);
      }

      if (params.action === 'findUnique') {
        params.action = 'findFirst';
        params.args.where = withUserFilter(params.args.where);
      }

      if (params.action === 'update' || params.action === 'delete') {
        const existing = await next({
          ...params,
          action: 'findFirst',
          args: { where: withUserFilter(params.args.where) },
        });

        if (!existing) {
          throw new ForbiddenException('Brak dostępu do wskazanego zasobu.');
        }
      }

      return next(params);
    });
    await this.$connect();
  }
}
