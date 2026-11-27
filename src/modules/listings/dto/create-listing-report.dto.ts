import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ListingReportReason } from '@mykwatta/modules/listings/constants';

export class CreateListingReportDto {
  @ApiProperty({ enum: ListingReportReason })
  @IsEnum(ListingReportReason)
  reason!: ListingReportReason;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  details?: string;
}
