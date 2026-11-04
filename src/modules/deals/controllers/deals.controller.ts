import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { CancelDealDto, CompleteDealDto } from '@mykwatta/modules/deals/dto';
import { DealsService } from '@mykwatta/modules/deals/services/deals.service';

@ApiTags('deals')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get('mine')
  listMine(@Session() session: UserSession) {
    return this.deals.listMine(session.user.id);
  }

  @Get(':dealId')
  getOne(@Param('dealId') dealId: string, @Session() session: UserSession) {
    return this.deals.getById(dealId, session.user.id);
  }

  @Post(':dealId/complete')
  complete(
    @Param('dealId') dealId: string,
    @Session() session: UserSession,
    @Body() body: CompleteDealDto,
  ) {
    return this.deals.complete(dealId, session.user.id, body);
  }

  @Post(':dealId/cancel')
  cancel(
    @Param('dealId') dealId: string,
    @Session() session: UserSession,
    @Body() body: CancelDealDto,
  ) {
    return this.deals.cancel(dealId, session.user.id, body);
  }
}
