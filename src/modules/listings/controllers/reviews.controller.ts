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
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  CreateReviewDto,
  UpdateReviewDto,
} from '@mykwatta/modules/listings/dto';
import { ReviewsService } from '@mykwatta/modules/listings/services/reviews.service';

@ApiTags('listings')
@Controller('listings/:listingId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @AllowAnonymous()
  list(@Param('listingId') listingId: string) {
    return this.reviewsService.listForListing(listingId);
  }

  @Post()
  @ApiBearerAuth()
  create(
    @Param('listingId') listingId: string,
    @Session() session: UserSession,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviewsService.create(listingId, session.user.id, body);
  }

  @Patch(':reviewId')
  @ApiBearerAuth()
  update(
    @Param('listingId') listingId: string,
    @Param('reviewId') reviewId: string,
    @Session() session: UserSession,
    @Body() body: UpdateReviewDto,
  ) {
    return this.reviewsService.update(
      listingId,
      reviewId,
      session.user.id,
      body,
    );
  }

  @Delete(':reviewId')
  @ApiBearerAuth()
  remove(
    @Param('listingId') listingId: string,
    @Param('reviewId') reviewId: string,
    @Session() session: UserSession,
  ) {
    return this.reviewsService.remove(listingId, reviewId, session.user.id);
  }
}
