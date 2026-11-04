import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { ApiConfigService } from '@mykwatta/core/config';
import { TwilioMode } from '@mykwatta/core/config/env.validation';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import { notifications } from '@mykwatta/core/database/schema/notifications.schema';
import {
  buildNotificationMetadata,
  NotificationChannel,
  NotificationEntityType,
  planIncludes,
  PushPlatform,
  resolveDeliveryChannels,
  type NotificationResourceIds,
} from '@mykwatta/modules/notifications/constants';
import { EmailProducer } from '@mykwatta/shared/queue';
import type { DeliverNotificationJobData } from '@mykwatta/shared/queue/jobs/deliver-notification.job';
import { PushService } from '@mykwatta/shared/push';
import { PusherService } from '@mykwatta/shared/pusher';
import { TwilioService } from '@mykwatta/shared/twilio';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PushDevicesService } from './push-devices.service';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly preferences: NotificationPreferencesService,
    private readonly pusher: PusherService,
    private readonly push: PushService,
    private readonly pushDevices: PushDevicesService,
    private readonly emailProducer: EmailProducer,
    private readonly twilio: TwilioService,
    private readonly config: ApiConfigService,
  ) {}

  async deliver(event: DeliverNotificationJobData): Promise<void> {
    const prefs = await this.preferences.resolveForDelivery(event.userId);
    const title = event.title.trim();
    const body = event.body.trim();
    const entityType = event.entityType ?? null;
    const entityId = event.entityId ?? null;
    const metadata = buildNotificationMetadata(
      event.type,
      event.resources ??
        (event.entityId
          ? this.entityIdAsResource(event.entityType, event.entityId)
          : {}),
    );

    const [devices, recipient] = await Promise.all([
      this.pushDevices.listTargetsForUser(event.userId),
      this.db.query.user.findFirst({
        where: eq(userTable.id, event.userId),
        columns: {
          email: true,
          phoneNumber: true,
        },
      }),
    ]);

    const whatsappTo = event.whatsapp?.to?.trim() || recipient?.phoneNumber;
    const emailTo = event.email?.to?.trim() || recipient?.email;
    const smsTo = event.sms?.to?.trim() || recipient?.phoneNumber;

    const plan = resolveDeliveryChannels(event.type, prefs, {
      hasPushDevices: devices.length > 0,
      hasWhatsappTarget: Boolean(whatsappTo),
      hasEmailTarget: Boolean(emailTo),
      hasSmsTarget: Boolean(smsTo),
    });

    if (plan.channels.length === 0) {
      this.logger.debug(
        `Notification skipped type=${event.type} user=${event.userId} urgency=${plan.urgency}`,
      );
      return;
    }

    this.logger.debug(
      `Notification plan type=${event.type} user=${event.userId} urgency=${plan.urgency} channels=${plan.channels.join(',')}`,
    );

    const id = createId();
    const createdAt = new Date();

    if (planIncludes(plan, NotificationChannel.IN_APP)) {
      await this.db.insert(notifications).values({
        id,
        userId: event.userId,
        type: event.type,
        title,
        body,
        entityType,
        entityId,
        metadata,
        createdAt,
      });

      await this.pusher.emitNotification(event.userId, {
        id,
        userId: event.userId,
        type: event.type,
        title,
        body,
        entityType,
        entityId,
        metadata,
        readAt: null,
        createdAt: createdAt.toISOString(),
      });
    }

    if (planIncludes(plan, NotificationChannel.PUSH)) {
      await this.emitMobilePush(devices, {
        id,
        type: event.type,
        title,
        body,
        entityType,
        entityId,
        metadataHref: metadata.href,
        metadataJson: JSON.stringify(metadata),
      });
    }

    if (planIncludes(plan, NotificationChannel.WHATSAPP) && whatsappTo) {
      const waBody = event.whatsapp?.body?.trim() || `${title}\n\n${body}`;
      await this.deliverWhatsapp(whatsappTo, waBody);
    }

    if (planIncludes(plan, NotificationChannel.EMAIL) && emailTo) {
      await this.emailProducer.enqueue({
        to: emailTo,
        subject: event.email?.subject?.trim() || title,
        text: event.email?.text?.trim() || body,
        html: event.email?.html,
      });
    }

    if (planIncludes(plan, NotificationChannel.SMS) && smsTo) {
      const smsBody = event.sms?.body?.trim() || `${title}: ${body}`;
      this.deliverSms(smsTo, smsBody);
    }
  }

  private async emitMobilePush(
    devices: Array<{ platform: PushPlatform; token: string }>,
    input: {
      id: string;
      type: string;
      title: string;
      body: string;
      entityType: NotificationEntityType | null;
      entityId: string | null;
      metadataHref: string;
      metadataJson: string;
    },
  ): Promise<void> {
    if (devices.length === 0) {
      return;
    }

    const invalidTokens = await this.push.sendToDevices(devices, {
      title: input.title,
      body: input.body,
      data: {
        notificationId: input.id,
        type: input.type,
        href: input.metadataHref,
        entityType: input.entityType ?? '',
        entityId: input.entityId ?? '',
        metadata: input.metadataJson,
      },
    });

    if (invalidTokens.length > 0) {
      await this.pushDevices.removeTokens(invalidTokens);
    }
  }

  private async deliverWhatsapp(to: string, body: string): Promise<void> {
    try {
      if (this.config.twilioMode === TwilioMode.Console) {
        this.logger.log(
          `[console whatsapp notification] to=${to} body=${body}`,
        );
        return;
      }
      await this.twilio.sendWhatsappMessage(to, body);
    } catch (error) {
      this.logger.warn(
        `WhatsApp notification failed to=${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private deliverSms(to: string, body: string): void {
    if (this.config.twilioMode === TwilioMode.Console) {
      this.logger.log(`[console sms notification] to=${to} body=${body}`);
      return;
    }
    this.logger.warn(
      `SMS notification skipped (no dedicated SMS sender configured) to=${to} bodyLength=${body.length}`,
    );
  }

  private entityIdAsResource(
    entityType: NotificationEntityType | undefined,
    entityId: string,
  ): NotificationResourceIds {
    switch (entityType) {
      case NotificationEntityType.INQUIRY:
        return { inquiryId: entityId };
      case NotificationEntityType.APPOINTMENT:
        return { appointmentId: entityId };
      case NotificationEntityType.PAYMENT:
        return { paymentId: entityId };
      case NotificationEntityType.APPLICATION:
        return { applicationId: entityId };
      case NotificationEntityType.LISTING:
        return { listingId: entityId };
      default:
        return {};
    }
  }
}
