import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import {
  NOTIFICATION_CHANNELS,
  NotificationChannel,
} from '@mykwatta/modules/notifications/constants';
import {
  ListNotificationsQueryDto,
  PusherAuthDto,
  RegisterPushDeviceDto,
  UnregisterPushDeviceDto,
  UpdateNotificationPreferencesDto,
} from '@mykwatta/modules/notifications/dto';
import { NotificationPreferencesService } from '@mykwatta/modules/notifications/services/notification-preferences.service';
import { NotificationsService } from '@mykwatta/modules/notifications/services/notifications.service';
import { PushDevicesService } from '@mykwatta/modules/notifications/services/push-devices.service';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { PusherService } from '@mykwatta/shared/pusher';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly preferences: NotificationPreferencesService,
    private readonly pushDevices: PushDevicesService,
    private readonly pusher: PusherService,
  ) {}

  @Get()
  list(
    @Session() session: UserSession,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.listMine(session.user.id, query);
  }

  @Get('unread-count')
  unreadCount(@Session() session: UserSession) {
    return this.notifications.unreadCount(session.user.id);
  }

  /** Public Pusher client settings for the signed-in user. */
  @Get('realtime')
  realtime(@Session() session: UserSession) {
    return this.pusher.clientConfig(session.user.id);
  }

  @Get('preferences')
  getPreferences(@Session() session: UserSession) {
    return this.preferences.getMine(session.user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @Session() session: UserSession,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    return this.preferences.updateMine(session.user.id, body);
  }

  /** Consent: enable a channel (PUSH | IN_APP | WHATSAPP | EMAIL | SMS). */
  @Post('preferences/channels/:channel/enable')
  enableChannel(
    @Session() session: UserSession,
    @Param('channel') channel: string,
  ) {
    return this.preferences.setChannelEnabled(
      session.user.id,
      this.parseChannel(channel),
      true,
    );
  }

  /** Consent: disable a channel. */
  @Post('preferences/channels/:channel/disable')
  disableChannel(
    @Session() session: UserSession,
    @Param('channel') channel: string,
  ) {
    return this.preferences.setChannelEnabled(
      session.user.id,
      this.parseChannel(channel),
      false,
    );
  }

  @Get('devices')
  listDevices(@Session() session: UserSession) {
    return this.pushDevices.listMine(session.user.id);
  }

  @Post('devices')
  registerDevice(
    @Session() session: UserSession,
    @Body() body: RegisterPushDeviceDto,
  ) {
    return this.pushDevices.register({
      userId: session.user.id,
      platform: body.platform,
      token: body.token,
      deviceId: body.deviceId,
    });
  }

  @Delete('devices')
  unregisterDevice(
    @Session() session: UserSession,
    @Body() body: UnregisterPushDeviceDto,
  ) {
    return this.pushDevices.unregister(session.user.id, body.token);
  }

  /**
   * Private-channel authorization for the Pusher JS client.
   * Returns the raw `{ auth }` body (not wrapped) so the SDK can consume it.
   */
  @Post('pusher/auth')
  authorize(
    @Session() session: UserSession,
    @Body() body: PusherAuthDto,
    @Res() res: Response,
  ) {
    const auth = this.pusher.authorizeUserChannel(
      session.user.id,
      body.socket_id,
      body.channel_name,
    );
    res.status(200).json(auth);
  }

  @Post('read-all')
  markAllRead(@Session() session: UserSession) {
    return this.notifications.markAllRead(session.user.id);
  }

  @Post(':notificationId/read')
  markRead(
    @Param('notificationId') notificationId: string,
    @Session() session: UserSession,
  ) {
    return this.notifications.markRead(notificationId, session.user.id);
  }

  private parseChannel(raw: string): NotificationChannel {
    const normalized = raw.trim().toUpperCase().replace(/-/g, '_');
    if (!NOTIFICATION_CHANNELS.includes(normalized as NotificationChannel)) {
      throw AppException.badRequest(
        `Invalid channel. Expected one of: ${NOTIFICATION_CHANNELS.join(', ')}`,
      );
    }
    return normalized as NotificationChannel;
  }
}
