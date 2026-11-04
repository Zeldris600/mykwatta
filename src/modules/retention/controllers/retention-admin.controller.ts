import { Body, Controller, Patch, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { SetDocumentsVerifiedDto } from '@mykwatta/modules/retention/dto';
import { DocsVerificationAdminService } from '@mykwatta/modules/retention/services';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class RetentionAdminController {
  constructor(
    private readonly docsVerification: DocsVerificationAdminService,
  ) {}

  @Patch('listings/:id/documents-verified')
  setDocumentsVerified(
    @Param('id') listingId: string,
    @Session() session: UserSession,
    @Body() body: SetDocumentsVerifiedDto,
  ) {
    return this.docsVerification.setDocumentsVerified(
      listingId,
      session.user.id,
      body.verified,
    );
  }
}
