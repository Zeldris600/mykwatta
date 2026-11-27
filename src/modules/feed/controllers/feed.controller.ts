import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  CreateFeedCommentDto,
  ListFeedCommentsQueryDto,
  ListFeedQueryDto,
} from '@mykwatta/modules/feed/dto';
import { FeedService } from '@mykwatta/modules/feed/services';
import { PusherService } from '@mykwatta/shared/pusher';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(
    private readonly feed: FeedService,
    private readonly pusher: PusherService,
  ) {}

  /** Public Pusher settings for the feed drop channel (no auth). */
  @Get('realtime')
  @OptionalAuth()
  realtime() {
    return this.pusher.publicFeedConfig();
  }

  @Get()
  @OptionalAuth()
  list(
    @Query() query: ListFeedQueryDto,
    @Session() session: UserSession | null,
  ) {
    return this.feed.listFeed(query, session?.user.id);
  }

  @Get('comments/:commentId/replies')
  @OptionalAuth()
  listReplies(
    @Param('commentId') commentId: string,
    @Query() query: ListFeedCommentsQueryDto,
    @Session() session: UserSession | null,
  ) {
    return this.feed.listReplies(commentId, query, session?.user.id);
  }

  @Post('comments/:commentId/like')
  @ApiBearerAuth()
  likeComment(
    @Param('commentId') commentId: string,
    @Session() session: UserSession,
  ) {
    return this.feed.toggleCommentLike(commentId, session.user.id);
  }

  @Delete('comments/:commentId')
  @ApiBearerAuth()
  hideComment(
    @Param('commentId') commentId: string,
    @Session() session: UserSession,
  ) {
    return this.feed.hideComment(commentId, session.user.id);
  }

  @Get(':feedPostId')
  @OptionalAuth()
  getOne(
    @Param('feedPostId') feedPostId: string,
    @Session() session: UserSession | null,
  ) {
    return this.feed.getPost(feedPostId, session?.user.id);
  }

  @Post(':feedPostId/like')
  @ApiBearerAuth()
  like(
    @Param('feedPostId') feedPostId: string,
    @Session() session: UserSession,
  ) {
    return this.feed.toggleLike(feedPostId, session.user.id);
  }

  @Get(':feedPostId/comments')
  @OptionalAuth()
  listComments(
    @Param('feedPostId') feedPostId: string,
    @Query() query: ListFeedCommentsQueryDto,
    @Session() session: UserSession | null,
  ) {
    return this.feed.listRootComments(feedPostId, query, session?.user.id);
  }

  @Post(':feedPostId/comments')
  @ApiBearerAuth()
  createComment(
    @Param('feedPostId') feedPostId: string,
    @Session() session: UserSession,
    @Body() body: CreateFeedCommentDto,
  ) {
    return this.feed.createComment(feedPostId, session.user.id, body);
  }

  @Post(':feedPostId/share')
  @OptionalAuth()
  share(
    @Param('feedPostId') feedPostId: string,
    @Session() session: UserSession | null,
  ) {
    return this.feed.share(feedPostId, session?.user.id);
  }
}
