import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { EscrowActionDto } from '@mykwatta/modules/escrow/dto';
import { EscrowService } from '@mykwatta/modules/escrow/services';

@ApiTags('escrow')
@ApiBearerAuth()
@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrow: EscrowService) {}

  @Get('me')
  listMine(@Session() session: UserSession) {
    return this.escrow.listMine(session.user.id);
  }

  @Get('admin')
  listAdmin(@Session() session: UserSession) {
    return this.escrow.listAdmin(session.user.id);
  }

  @Post(':id/release')
  release(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() body: EscrowActionDto,
  ) {
    return this.escrow.release(id, session.user.id, body.reason);
  }

  @Post(':id/refund')
  refund(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() body: EscrowActionDto,
  ) {
    return this.escrow.refund(id, session.user.id, body.reason);
  }
}
