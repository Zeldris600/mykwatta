import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CompleteDealDto {
  @ApiPropertyOptional({ example: 'Keys handed over; lease started.' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  notes?: string;
}
