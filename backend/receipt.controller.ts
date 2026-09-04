import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from './auth.guard';
import { ReceiptService } from './receipt.service';
import { TenantInterceptor } from './tenant.interceptor';

@Controller('api/receipts')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('receipt', {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  }))
  async analyze(@UploadedFile() file: { buffer: Buffer } | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Wybierz zdjęcie paragonu.');
    }
    return this.receiptService.analyze(file.buffer);
  }
}
