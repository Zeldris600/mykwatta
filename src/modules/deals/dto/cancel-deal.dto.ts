import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CancelDealDto {
  @ApiProperty({ example: 'Applicant withdrew after acceptance.' })
  @IsString()
  @MinLength(3)
  reason!: string;
}
