import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class CreateOrganisationDto {
  @ApiProperty({ example: 'Morningstar Properties' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'morningstar-properties' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}
