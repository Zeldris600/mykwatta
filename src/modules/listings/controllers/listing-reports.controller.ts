import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { CreateListingReportDto } from '@mykwatta/modules/listings/dto';
import { ListingReportsService } from '@mykwatta/modules/listings/services/listing-reports.service';

@ApiTags('listings')
@ApiBearerAuth()
@Controller('listings')
export class ListingReportsController {
  constructor(private readonly listingReports: ListingReportsService) {}

  @Post(':id/reports')
  create(
    @Param('id') listingId: string,
    @Session() session: UserSession,
    @Body() body: CreateListingReportDto,
  ) {
    return this.listingReports.create(listingId, session.user.id, body);
  }
}
