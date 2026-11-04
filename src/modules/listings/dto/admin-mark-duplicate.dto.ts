import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminMarkDuplicateDto {
  @ApiProperty({ description: 'Canonical listing id this listing duplicates' })
  @IsString()
  @MinLength(8)
  duplicateOfListingId!: string;
}
