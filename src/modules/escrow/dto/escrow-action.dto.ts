import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EscrowActionDto {
  @ApiPropertyOptional({ description: 'Reason for release or refund' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
