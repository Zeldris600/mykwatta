import { Module } from '@nestjs/common';
import {
  AdminDirectoryController,
  DirectoryController,
} from '@mykwatta/modules/directory/controllers';
import { DirectoryService } from '@mykwatta/modules/directory/services';
import { IdentityModule } from '@mykwatta/modules/identity';

@Module({
  imports: [IdentityModule],
  controllers: [DirectoryController, AdminDirectoryController],
  providers: [DirectoryService],
  exports: [DirectoryService],
})
export class DirectoryModule {}
