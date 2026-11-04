import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { ApplicationStatus } from '@mykwatta/modules/applications/constants';

const DECISIONS = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
] as const;

export class DecideApplicationDto {
  @ApiProperty({
    enum: DECISIONS,
    example: ApplicationStatus.ACCEPTED,
  })
  @IsIn(DECISIONS)
  status!: (typeof DECISIONS)[number];

  @ApiPropertyOptional({ example: 'Another applicant was selected' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  decisionReason?: string;

  @ApiPropertyOptional({
    example: 500,
    description: 'Agency commission in basis points, recorded on the deal when accepted',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  commissionBps?: number;
}
