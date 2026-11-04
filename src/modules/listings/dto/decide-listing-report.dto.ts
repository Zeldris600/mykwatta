import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListingReportStatus } from '@mykwatta/modules/listings/constants';

const DECIDABLE_STATUSES = [
  ListingReportStatus.REVIEWING,
  ListingReportStatus.RESOLVED,
  ListingReportStatus.DISMISSED,
] as const;

export class DecideListingReportDto {
  @ApiProperty({ enum: DECIDABLE_STATUSES })
  @IsEnum(ListingReportStatus)
  status!: (typeof DECIDABLE_STATUSES)[number];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
