import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListingVerificationStatus } from '@mykwatta/modules/listings/constants';

const ADMIN_VERIFICATION_STATUSES = [
  ListingVerificationStatus.VERIFIED,
  ListingVerificationStatus.REJECTED,
  ListingVerificationStatus.PENDING,
] as const;

export class AdminListingVerificationDto {
  @ApiProperty({ enum: ADMIN_VERIFICATION_STATUSES })
  @IsEnum(ListingVerificationStatus)
  status!: (typeof ADMIN_VERIFICATION_STATUSES)[number];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
