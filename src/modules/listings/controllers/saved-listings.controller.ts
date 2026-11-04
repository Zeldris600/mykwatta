import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ListListingsQueryDto } from '@mykwatta/modules/listings/dto';
import { SavedListingsService } from '@mykwatta/modules/listings/services/saved-listings.service';

@ApiTags('listings')
@ApiBearerAuth()
@Controller('listings')
export class SavedListingsController {
  constructor(private readonly savedListingsService: SavedListingsService) {}

  @Get('saved')
  listMine(
    @Session() session: UserSession,
    @Query() query: ListListingsQueryDto,
  ) {
    return this.savedListingsService.listMine(session.user.id, query);
  }

  @Post(':listingId/save')
  save(@Param('listingId') listingId: string, @Session() session: UserSession) {
    return this.savedListingsService.save(listingId, session.user.id);
  }

  @Delete(':listingId/save')
  unsave(
    @Param('listingId') listingId: string,
    @Session() session: UserSession,
  ) {
    return this.savedListingsService.unsave(listingId, session.user.id);
  }
}
