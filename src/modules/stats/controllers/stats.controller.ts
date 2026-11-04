import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { IdentityService } from '@mykwatta/modules/identity/services';
import { StatsService } from '@mykwatta/modules/stats/services';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(
    private readonly stats: StatsService,
    private readonly identity: IdentityService,
  ) {}

  @Get('me')
  async getMe(@Session() session: UserSession) {
    const personas = await this.identity.listPersonasForUser(session.user.id);
    return this.stats.getMe(session.user.id, personas);
  }

  @Get('platform')
  getPlatform(@Session() session: UserSession) {
    return this.stats.getPlatform(session.user.id);
  }
}
