import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty({
    example: 'Is this still available for viewing this weekend?',
  })
  @IsString()
  @MinLength(10)
  message!: string;

  @ApiPropertyOptional({ example: '+237612345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'contactPhone must be E.164 (e.g. +237612345678)',
  })
  contactPhone?: string;
}
