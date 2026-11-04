import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { UploadListingMediaDto } from '@mykwatta/modules/listings/dto';
import {
  ListingMediaService,
  listingMediaMulterOptions,
} from '@mykwatta/modules/listings/services/listing-media.service';

@ApiTags('listings')
@Controller('listings/:listingId/media')
export class ListingMediaController {
  constructor(private readonly mediaService: ListingMediaService) {}

  @Get()
  @OptionalAuth()
  list(
    @Param('listingId') listingId: string,
    @Session() session: UserSession | null,
  ) {
    return this.mediaService.listForListing(listingId, session?.user.id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        sortOrder: { type: 'integer', minimum: 0 },
        caption: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', listingMediaMulterOptions))
  upload(
    @Param('listingId') listingId: string,
    @Session() session: UserSession,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: UploadListingMediaDto,
  ) {
    return this.mediaService.upload(listingId, session.user.id, file, body);
  }

  @Delete(':mediaId')
  @ApiBearerAuth()
  remove(
    @Param('listingId') listingId: string,
    @Param('mediaId') mediaId: string,
    @Session() session: UserSession,
  ) {
    return this.mediaService.remove(listingId, mediaId, session.user.id);
  }
}
