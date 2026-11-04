import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import {
  APPLICATION_TYPES,
  ApplicationType,
} from '@mykwatta/modules/applications/constants';

export class CreateApplicationDto {
  @ApiProperty({ description: 'Succeeded deposit payment id' })
  @IsString()
  @MinLength(1)
  paymentId!: string;

  @ApiProperty({ enum: APPLICATION_TYPES })
  @IsEnum(ApplicationType)
  type!: ApplicationType;

  @ApiProperty({ example: 'I would like to rent starting next month.' })
  @IsString()
  @MinLength(10)
  message!: string;

  @ApiPropertyOptional({
    example: 40_000_000,
    description: 'Required for PURCHASE_OFFER (minor units)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  offerAmountMinor?: number;

  @ApiPropertyOptional({ enum: CurrencyCode, example: CurrencyCode.XAF })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @ApiPropertyOptional({ example: '2026-12-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  proposedMoveInAt?: Date;
}
