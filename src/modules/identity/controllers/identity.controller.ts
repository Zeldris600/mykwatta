import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  AcceptInviteDto,
  CreateInviteDto,
  CreateOrganisationDto,
  SignUpWithPhoneDto,
  UpdatePersonasDto,
  UpdatePreferredLocaleDto,
  UploadOrgDocumentDto,
} from '@mykwatta/modules/identity/dto';
import {
  IdentityService,
  orgDocumentMulterOptions,
} from '@mykwatta/modules/identity/services';

@ApiTags('identity')
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('personas')
  @AllowAnonymous()
  listPersonas() {
    return { personas: this.identityService.listAvailablePersonas() };
  }

  /**
   * Signup for any persona(s). Does not create an organisation.
   * 1) Better Auth send-otp
   * 2) POST /api/identity/auth/signup { phoneNumber, code, email, name, personas }
   */
  @Post('auth/signup')
  @AllowAnonymous()
  signUp(@Body() body: SignUpWithPhoneDto) {
    return this.identityService.signUpWithPhoneOtp(body);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@Session() session: UserSession) {
    return this.identityService.getProfile(session.user.id);
  }

  @Patch('me/personas')
  @ApiBearerAuth()
  updatePersonas(
    @Session() session: UserSession,
    @Body() body: UpdatePersonasDto,
  ) {
    return this.identityService.setPersonas(session.user.id, body.personas);
  }

  @Patch('me/locale')
  @ApiBearerAuth()
  updateLocale(
    @Session() session: UserSession,
    @Body() body: UpdatePreferredLocaleDto,
  ) {
    return this.identityService.updatePreferredLocale(session.user.id, body);
  }

  @Get('me/memberships')
  @ApiBearerAuth()
  listMyMemberships(@Session() session: UserSession) {
    return this.identityService.listMembershipsForUser(session.user.id);
  }

  /** Opt-in: agencies / portfolios. Never required for renters/buyers. */
  @Post('organisations/:organisationId/documents')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['document', 'documentType'],
      properties: {
        document: { type: 'string', format: 'binary' },
        documentType: { type: 'string', enum: ['LICENCE', 'NUI'] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('document', orgDocumentMulterOptions))
  uploadOrgDocument(
    @Session() session: UserSession,
    @Param('organisationId') organisationId: string,
    @Body() body: UploadOrgDocumentDto,
    @UploadedFile() document: Express.Multer.File | undefined,
  ) {
    return this.identityService.uploadOrgDocument(
      organisationId,
      session.user.id,
      body,
      document,
    );
  }

  @Post('admin/organisations/:organisationId/verify-licence')
  @ApiBearerAuth()
  verifyOrgLicence(
    @Session() session: UserSession,
    @Param('organisationId') organisationId: string,
  ) {
    return this.identityService.adminVerifyOrgLicence(
      organisationId,
      session.user.id,
    );
  }

  @Post('organisations')
  @ApiBearerAuth()
  createOrganisation(
    @Session() session: UserSession,
    @Body() body: CreateOrganisationDto,
  ) {
    return this.identityService.createOrganisation({
      name: body.name,
      slug: body.slug,
      ownerUserId: session.user.id,
    });
  }

  @Post('organisations/:organisationId/invites')
  @ApiBearerAuth()
  createInvite(
    @Session() session: UserSession,
    @Param('organisationId') organisationId: string,
    @Body() body: CreateInviteDto,
  ) {
    return this.identityService.createInvite({
      organisationId,
      invitedByUserId: session.user.id,
      email: body.email,
      role: body.role,
    });
  }

  @Get('organisations/:organisationId/invites')
  @ApiBearerAuth()
  listInvites(
    @Session() session: UserSession,
    @Param('organisationId') organisationId: string,
  ) {
    return this.identityService.listInvites(organisationId, session.user.id);
  }

  @Post('invites/:inviteId/revoke')
  @ApiBearerAuth()
  revokeInvite(
    @Session() session: UserSession,
    @Param('inviteId') inviteId: string,
  ) {
    return this.identityService.revokeInvite({
      inviteId,
      requesterUserId: session.user.id,
    });
  }

  @Post('invites/accept')
  @ApiBearerAuth()
  acceptInvite(@Session() session: UserSession, @Body() body: AcceptInviteDto) {
    return this.identityService.acceptInvite({
      token: body.token,
      userId: session.user.id,
    });
  }
}
