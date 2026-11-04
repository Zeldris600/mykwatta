import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import {
  PAYMENT_CHANNELS,
  PaymentChannel,
} from '@mykwatta/modules/payments/constants';

export class CreateDepositDto {
  @ApiProperty({ description: 'Listing to pay a deposit against' })
  @IsString()
  @MinLength(1)
  listingId!: string;

  @ApiProperty({
    example: 50000,
    description: 'Amount in minor units (XAF francs, USD/EUR cents)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @ApiProperty({ enum: CurrencyCode, example: CurrencyCode.XAF })
  @IsEnum(CurrencyCode)
  currency!: CurrencyCode;

  @ApiProperty({
    enum: PAYMENT_CHANNELS,
    example: PaymentChannel.MOBILE_MONEY,
    description: 'MOBILE_MONEY → Fapshi (XAF); CARD → Stripe (USD/EUR)',
  })
  @IsEnum(PaymentChannel)
  channel!: PaymentChannel;

  @ApiPropertyOptional({
    example: 'http://localhost:3000/payments/return',
    description:
      'Redirect after checkout (defaults to APP_URL/payments/return)',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUrl?: string;
}
