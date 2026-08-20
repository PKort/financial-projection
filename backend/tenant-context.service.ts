import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<{ userId: number }>();

  run<T>(userId: number, callback: () => T): T {
    return this.storage.run({ userId }, callback);
  }

  get userId() {
    return this.storage.getStore()?.userId;
  }
}
