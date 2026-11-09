import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  FEED_COMMENT_DEFAULT_LIMIT,
  FEED_COMMENT_MAX_LIMIT,
} from '@mykwatta/modules/feed/constants';

export class ListFeedCommentsQueryDto {
  @ApiPropertyOptional({
    type: Number,
    default: FEED_COMMENT_DEFAULT_LIMIT,
    minimum: 1,
    maximum: FEED_COMMENT_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FEED_COMMENT_MAX_LIMIT)
  page = 1;

  @ApiPropertyOptional({
    type: Number,
    default: FEED_COMMENT_DEFAULT_LIMIT,
    minimum: 1,
    maximum: FEED_COMMENT_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FEED_COMMENT_MAX_LIMIT)
  limit = FEED_COMMENT_DEFAULT_LIMIT;
}
