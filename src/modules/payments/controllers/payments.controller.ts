import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { CreateDepositDto } from '@mykwatta/modules/payments/dto';
import { PaymentQuotesService } from '@mykwatta/modules/payments/services/payment-quotes.service';
import { PaymentsAppService } from '@mykwatta/modules/payments/services/payments-app.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsApp: PaymentsAppService,
    private readonly paymentQuotes: PaymentQuotesService,
  ) {}

  @Get('quotes/deposit')
  @ApiQuery({ name: 'listingId', required: true })
  quoteDeposit(@Query('listingId') listingId: string) {
    return this.paymentQuotes.quoteDeposit(listingId);
  }

  @Get('quotes/viewing-fee')
  @ApiQuery({ name: 'listingId', required: true })
  quoteViewingFee(@Query('listingId') listingId: string) {
    return this.paymentQuotes.quoteViewingFee(listingId);
  }

  @Get('quotes/application-fee')
  @ApiQuery({ name: 'listingId', required: true })
  quoteApplicationFee(@Query('listingId') listingId: string) {
    return this.paymentQuotes.quoteApplicationFee(listingId);
  }

  @Get('quotes/docs-verification')
  @ApiQuery({ name: 'listingId', required: true })
  quoteDocsVerification(@Query('listingId') listingId: string) {
    return this.paymentQuotes.quoteDocsVerification(listingId);
  }

  @Get('quotes/vendor-lead-fee')
  quoteVendorLeadFee() {
    return this.paymentQuotes.quoteVendorLeadFee();
  }

  @Get('quotes/rent-payment')
  @ApiQuery({ name: 'scheduleItemId', required: true })
  quoteRentPayment(
    @Query('scheduleItemId') scheduleItemId: string,
    @Session() session: UserSession,
  ) {
    return this.paymentQuotes.quoteRentPayment(scheduleItemId, session.user.id);
  }

  @Post('deposits')
  createDeposit(
    @Session() session: UserSession,
    @Body() body: CreateDepositDto,
  ) {
    return this.paymentsApp.createDeposit(session.user.id, body);
  }

  @Get('mine')
  listMine(@Session() session: UserSession) {
    return this.paymentsApp.listMine(session.user.id);
  }

  @Get(':paymentId')
  getOne(
    @Param('paymentId') paymentId: string,
    @Session() session: UserSession,
  ) {
    return this.paymentsApp.getMineById(paymentId, session.user.id);
  }

  /** Local/dev: complete a CONSOLE deposit without a real PSP. */
  @Post(':paymentId/complete-console')
  completeConsole(
    @Param('paymentId') paymentId: string,
    @Session() session: UserSession,
  ) {
    return this.paymentsApp.completeConsolePayment(paymentId, session.user.id);
  }
}
