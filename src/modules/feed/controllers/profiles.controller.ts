import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ListFeedQueryDto } from '@mykwatta/modules/feed/dto';
import { FeedProfilesService } from '@mykwatta/modules/feed/services';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: FeedProfilesService) {}

  @Get('users/:userId')
  @OptionalAuth()
  getUser(@Param('userId') userId: string) {
    return this.profiles.getUserProfile(userId);
  }

  @Get('users/:userId/feed')
  @OptionalAuth()
  getUserFeed(
    @Param('userId') userId: string,
    @Query() query: ListFeedQueryDto,
    @Session() session: UserSession | null,
  ) {
    return this.profiles.getUserFeed(userId, query, session?.user.id);
  }

  @Get('organisations/:organisationId')
  @OptionalAuth()
  getOrganisation(@Param('organisationId') organisationId: string) {
    return this.profiles.getOrganisationProfile(organisationId);
  }

  @Get('organisations/:organisationId/feed')
  @OptionalAuth()
  getOrganisationFeed(
    @Param('organisationId') organisationId: string,
    @Query() query: ListFeedQueryDto,
    @Session() session: UserSession | null,
  ) {
    return this.profiles.getOrganisationFeed(
      organisationId,
      query,
      session?.user.id,
    );
  }
}
