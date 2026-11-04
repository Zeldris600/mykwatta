import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { UploadTitleDocumentDto } from '@mykwatta/modules/listings/dto';
import {
  TitleDocumentsService,
  titleDocumentMulterOptions,
} from '@mykwatta/modules/listings/services/title-documents.service';

@ApiTags('listings')
@ApiBearerAuth()
@Controller('listings/:listingId/title-documents')
export class TitleDocumentsController {
  constructor(private readonly titleDocuments: TitleDocumentsService) {}

  @Get()
  list(@Param('listingId') listingId: string, @Session() session: UserSession) {
    return this.titleDocuments.listForManager(listingId, session.user.id);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'documentType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', titleDocumentMulterOptions))
  upload(
    @Param('listingId') listingId: string,
    @Session() session: UserSession,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: UploadTitleDocumentDto,
  ) {
    return this.titleDocuments.upload(listingId, session.user.id, file, body);
  }
}
