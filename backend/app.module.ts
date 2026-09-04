import { Module } from '@nestjs/common';
import { ProjectionController } from './projection.controller';
import { ProjectionService } from './projection.service';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { TenantContextService } from './tenant-context.service';
import { TenantInterceptor } from './tenant.interceptor';
import { AdminUsersController } from './admin-users.controller';
import { ReceiptController } from './receipt.controller';
import { ReceiptService } from './receipt.service';

@Module({
  imports: [],
  controllers: [ProjectionController, AuthController, AdminUsersController, ReceiptController],
  providers: [ProjectionService, PrismaService, AuthService, AuthGuard, TenantContextService, TenantInterceptor, ReceiptService],
})
export class AppModule {}
