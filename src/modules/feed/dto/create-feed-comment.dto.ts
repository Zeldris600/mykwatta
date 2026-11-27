import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FEED_COMMENT_MAX_BODY } from '@mykwatta/modules/feed/constants';

export class CreateFeedCommentDto {
  @ApiProperty({ example: 'Is this still available?' })
  @IsString()
  @MinLength(1)
  @MaxLength(FEED_COMMENT_MAX_BODY)
  body!: string;

  @ApiPropertyOptional({
    description:
      'Root comment id when posting a reply. Omit for a top-level comment. Replies cannot nest further.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  parentCommentId?: string;
}
