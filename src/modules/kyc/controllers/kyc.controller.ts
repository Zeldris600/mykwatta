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
import { DecideKycDto, SubmitKycDto } from '@mykwatta/modules/kyc/dto';
import {
  KycService,
  kycDocumentMulterOptions,
} from '@mykwatta/modules/kyc/services/kyc.service';

@ApiTags('kyc')
@ApiBearerAuth()
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('me')
  getMine(@Session() session: UserSession) {
    return this.kycService.getMine(session.user.id);
  }

  @Post('submit')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['document', 'documentType', 'documentNumber', 'fullName'],
      properties: {
        document: { type: 'string', format: 'binary' },
        documentType: {
          type: 'string',
          enum: [
            'NATIONAL_ID',
            'PASSPORT',
            'DRIVERS_LICENSE',
            'BUSINESS_REGISTRATION',
          ],
        },
        documentNumber: { type: 'string' },
        fullName: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('document', kycDocumentMulterOptions))
  submit(
    @Session() session: UserSession,
    @Body() body: SubmitKycDto,
    @UploadedFile() document: Express.Multer.File | undefined,
  ) {
    return this.kycService.submit(session.user.id, body, document);
  }

  @Get('queue')
  listQueue(@Session() session: UserSession) {
    return this.kycService.listUnderReview(session.user.id);
  }

  @Post(':userId/decide')
  decide(
    @Session() session: UserSession,
    @Param('userId') userId: string,
    @Body() body: DecideKycDto,
  ) {
    return this.kycService.decide(userId, session.user.id, body);
  }
}
