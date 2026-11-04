import { Global, Module } from '@nestjs/common';
import { ApiConfigService } from '@mykwatta/core/config';
import { StorageProviderName } from '@mykwatta/core/config/env.validation';
import { ConsoleStorageProvider } from './providers/console.storage-provider';
import { RustfsStorageProvider } from './providers/rustfs.storage-provider';
import { StorageService } from './storage.service';
import { STORAGE_PROVIDER } from './storage.tokens';

@Global()
@Module({
  providers: [
    ConsoleStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ApiConfigService, ConsoleStorageProvider],
      useFactory: (
        config: ApiConfigService,
        consoleProvider: ConsoleStorageProvider,
      ) => {
        switch (config.storageProvider) {
          case StorageProviderName.CONSOLE:
            return consoleProvider;
          case StorageProviderName.RUSTFS:
            return new RustfsStorageProvider(config);
          default: {
            const exhaustive: never = config.storageProvider;
            return exhaustive;
          }
        }
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
