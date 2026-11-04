import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import {
  LISTING_TYPES,
  ListingType,
  PROPERTY_TYPES,
  PropertyType,
  TITLE_STATUSES,
  TitleStatus,
} from '@mykwatta/modules/listings/constants';

export class CreateListingDto {
  @ApiProperty({ example: '2-bedroom apartment in Bastos' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ example: 'Bright apartment near schools and shops.' })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({ enum: LISTING_TYPES, example: ListingType.RENT })
  @IsEnum(ListingType)
  listingType!: ListingType;

  @ApiProperty({ enum: PROPERTY_TYPES, example: PropertyType.APARTMENT })
  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @ApiProperty({
    example: 250000,
    description: 'Price in minor units (e.g. XAF francs)',
  })
  @IsInt()
  @Min(0)
  priceMinor!: number;

  @ApiPropertyOptional({ enum: CurrencyCode, example: CurrencyCode.XAF })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @ApiProperty({ example: 'Yaoundé' })
  @IsString()
  @MinLength(2)
  city!: string;

  @ApiPropertyOptional({ example: 'Bastos' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'Rue 1.234' })
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiPropertyOptional({ example: 'CM', default: 'CM' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  countryCode?: string;

  @ApiPropertyOptional({ example: 3.868, description: 'WGS84 latitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 11.521, description: 'WGS84 longitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ example: 85 })
  @IsOptional()
  @IsInt()
  @Min(0)
  areaSqm?: number;

  @ApiPropertyOptional({
    description: 'Optional organisation id when posting as an agency',
  })
  @IsOptional()
  @IsString()
  organisationId?: string;

  @ApiPropertyOptional({
    example: 'seed_geo_quartier_bastos',
    description: 'Geo quartier id from GET /geo/cities/:id/quartiers',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  quartierId?: string;

  @ApiPropertyOptional({ enum: TITLE_STATUSES, default: TitleStatus.UNKNOWN })
  @IsOptional()
  @IsEnum(TitleStatus)
  titleStatus?: TitleStatus;

  @ApiPropertyOptional({
    type: [String],
    example: ['generator', 'parking'],
    description: 'Amenity catalog slugs',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  amenitySlugs?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['school', 'marche'],
    description: 'Landmark catalog slugs',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  landmarkSlugs?: string[];
}
