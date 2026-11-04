import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ListingMediaKind } from '@mykwatta/modules/listings/constants';

export class UploadListingMediaDto {
  @ApiPropertyOptional({
    example: 0,
    description: 'Display order (lower first). Defaults to next slot.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: 'Living room' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @ApiPropertyOptional({
    enum: ListingMediaKind,
    default: ListingMediaKind.PHOTO,
  })
  @IsOptional()
  @IsEnum(ListingMediaKind)
  kind?: ListingMediaKind;
}
