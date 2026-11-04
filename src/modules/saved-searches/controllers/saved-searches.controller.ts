import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
} from '@mykwatta/modules/saved-searches/dto';
import { SavedSearchesService } from '@mykwatta/modules/saved-searches/services/saved-searches.service';

@ApiTags('saved-searches')
@ApiBearerAuth()
@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private readonly savedSearches: SavedSearchesService) {}

  @Post()
  create(@Session() session: UserSession, @Body() body: CreateSavedSearchDto) {
    return this.savedSearches.create(session.user.id, body);
  }

  @Get()
  listMine(@Session() session: UserSession) {
    return this.savedSearches.listMine(session.user.id);
  }

  @Get(':id/matches')
  listMatches(@Param('id') id: string, @Session() session: UserSession) {
    return this.savedSearches.listMatches(id, session.user.id);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Session() session: UserSession) {
    return this.savedSearches.getMine(id, session.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() body: UpdateSavedSearchDto,
  ) {
    return this.savedSearches.update(id, session.user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Session() session: UserSession) {
    return this.savedSearches.remove(id, session.user.id);
  }
}
