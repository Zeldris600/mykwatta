import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  CreateListingDto,
  ListListingsQueryDto,
  UpdateListingDto,
} from '@mykwatta/modules/listings/dto';
import { ListingMediaService } from '@mykwatta/modules/listings/services/listing-media.service';
import { ListingsService } from '@mykwatta/modules/listings/services';
import { SavedListingsService } from '@mykwatta/modules/listings/services/saved-listings.service';
import { DepositAvailabilityService } from '@mykwatta/modules/payments/services';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly mediaService: ListingMediaService,
    private readonly savedListingsService: SavedListingsService,
    private readonly depositAvailability: DepositAvailabilityService,
  ) {}

  @Get()
  @OptionalAuth()
  async listPublished(
    @Query() query: ListListingsQueryDto,
    @Session() session: UserSession | null,
  ) {
    const result = await this.listingsService.listPublished(query);
    const withMedia = await this.mediaService.attachMediaToListings(
      result.data,
    );
    const withSaved = await this.savedListingsService.attachSavedFlag(
      withMedia,
      session?.user.id,
    );
    return {
      ...result,
      data: await this.depositAvailability.attachToListings(
        withSaved,
        session?.user.id,
      ),
    };
  }

  @Get('mine')
  @ApiBearerAuth()
  async listMine(
    @Session() session: UserSession,
    @Query() query: ListListingsQueryDto,
  ) {
    const result = await this.listingsService.listMine(session.user.id, query);
    const withMedia = await this.mediaService.attachMediaToListings(
      result.data,
    );
    const withSaved = await this.savedListingsService.attachSavedFlag(
      withMedia,
      session.user.id,
    );
    return {
      ...result,
      data: await this.depositAvailability.attachToListings(
        withSaved,
        session.user.id,
      ),
    };
  }

  @Get(':id')
  @OptionalAuth()
  async getOne(
    @Param('id') id: string,
    @Session() session: UserSession | null,
  ) {
    const listing = await this.listingsService.getPublicOrOwned(
      id,
      session?.user.id,
    );
    const [withMedia] = await this.mediaService.attachMediaToListings([
      listing,
    ]);
    const [withSaved] = await this.savedListingsService.attachSavedFlag(
      [withMedia],
      session?.user.id,
    );
    const [withDeposit] = await this.depositAvailability.attachToListings(
      [withSaved],
      session?.user.id,
    );
    return withDeposit;
  }

  @Post()
  @ApiBearerAuth()
  async create(
    @Session() session: UserSession,
    @Body() body: CreateListingDto,
  ) {
    const listing = await this.listingsService.create(session.user.id, body);
    const [withMedia] = await this.mediaService.attachMediaToListings([
      listing,
    ]);
    return { ...withMedia, saved: false };
  }

  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() body: UpdateListingDto,
  ) {
    const listing = await this.listingsService.update(
      id,
      session.user.id,
      body,
    );
    const [withMedia] = await this.mediaService.attachMediaToListings([
      listing,
    ]);
    const [withSaved] = await this.savedListingsService.attachSavedFlag(
      [withMedia],
      session.user.id,
    );
    return withSaved;
  }

  @Post(':id/premium/apply')
  @ApiBearerAuth()
  async applyPremium(
    @Param('id') id: string,
    @Session() session: UserSession,
  ) {
    const listing = await this.listingsService.applyPremium(id, session.user.id);
    const [withMedia] = await this.mediaService.attachMediaToListings([
      listing,
    ]);
    const [withSaved] = await this.savedListingsService.attachSavedFlag(
      [withMedia],
      session.user.id,
    );
    return withSaved;
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  async publish(@Param('id') id: string, @Session() session: UserSession) {
    const listing = await this.listingsService.publish(id, session.user.id);
    const [withMedia] = await this.mediaService.attachMediaToListings([
      listing,
    ]);
    const [withSaved] = await this.savedListingsService.attachSavedFlag(
      [withMedia],
      session.user.id,
    );
    return withSaved;
  }

  @Post(':id/archive')
  @ApiBearerAuth()
  async archive(@Param('id') id: string, @Session() session: UserSession) {
    const listing = await this.listingsService.archive(id, session.user.id);
    const [withMedia] = await this.mediaService.attachMediaToListings([
      listing,
    ]);
    const [withSaved] = await this.savedListingsService.attachSavedFlag(
      [withMedia],
      session.user.id,
    );
    return withSaved;
  }
}
