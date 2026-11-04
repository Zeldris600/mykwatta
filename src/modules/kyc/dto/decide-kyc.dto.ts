import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { KycStatus } from '@mykwatta/modules/kyc/constants';

const KYC_DECISIONS = [KycStatus.APPROVED, KycStatus.REJECTED] as const;

export class DecideKycDto {
  @ApiProperty({ enum: KYC_DECISIONS, example: KycStatus.APPROVED })
  @IsEnum(KYC_DECISIONS)
  status!: (typeof KYC_DECISIONS)[number];

  @ApiPropertyOptional({
    description: 'Required when status is REJECTED',
  })
  @ValidateIf((body: DecideKycDto) => body.status === KycStatus.REJECTED)
  @IsString()
  @MinLength(3)
  rejectionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
