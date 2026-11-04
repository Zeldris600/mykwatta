import { Module } from '@nestjs/common';
import { SavedSearchesController } from '@mykwatta/modules/saved-searches/controllers';
import { SavedSearchMatchProcessor } from '@mykwatta/modules/saved-searches/processors/saved-search-match.processor';
import { SavedSearchesService } from '@mykwatta/modules/saved-searches/services';

@Module({
  controllers: [SavedSearchesController],
  providers: [SavedSearchesService, SavedSearchMatchProcessor],
  exports: [SavedSearchesService],
})
export class SavedSearchesModule {}
