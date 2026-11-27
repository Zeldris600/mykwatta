import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import {
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
} from '@mykwatta/modules/feed/constants';

export class ListFeedQueryDto {
  @ApiPropertyOptional({
    type: Number,
    default: FEED_DEFAULT_LIMIT,
    minimum: 1,
    maximum: FEED_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FEED_MAX_LIMIT)
  limit = FEED_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description:
      'Opaque cursor from previous page (`publishedAtIso|id`). Omit for first page.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  cursor?: string;
}
