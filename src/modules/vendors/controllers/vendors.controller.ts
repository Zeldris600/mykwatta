import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { VendorCategory } from '@mykwatta/modules/vendors/constants';
import { CreateVendorDto, RequestVendorLeadDto } from '@mykwatta/modules/vendors/dto';
import { VendorsService } from '@mykwatta/modules/vendors/services';

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'category', required: false, enum: VendorCategory })
  list(@Query('city') city?: string, @Query('category') category?: VendorCategory) {
    return this.vendors.listVendors(city, category);
  }

  @ApiBearerAuth()
  @Post('admin')
  createVendor(@Session() session: UserSession, @Body() body: CreateVendorDto) {
    return this.vendors.createVendor(session.user.id, body);
  }

  @ApiBearerAuth()
  @Get('leads/mine')
  listMyLeads(@Session() session: UserSession) {
    return this.vendors.listMyLeads(session.user.id);
  }

  @ApiBearerAuth()
  @Post('leads/:leadId/send')
  sendLead(
    @Param('leadId') leadId: string,
    @Session() session: UserSession,
    @Body() body: { paymentId: string },
  ) {
    return this.vendors.sendLead(leadId, session.user.id, body.paymentId);
  }

  @Get(':vendorId')
  getOne(@Param('vendorId') vendorId: string) {
    return this.vendors.getVendor(vendorId);
  }

  @ApiBearerAuth()
  @Post(':vendorId/leads')
  requestLead(
    @Param('vendorId') vendorId: string,
    @Session() session: UserSession,
    @Body() body: RequestVendorLeadDto,
  ) {
    return this.vendors.requestLead(vendorId, session.user.id, body);
  }
}
