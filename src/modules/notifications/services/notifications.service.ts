import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { notifications } from '@mykwatta/core/database/schema/notifications.schema';
import type {
  NotificationEntityType,
  NotificationResourceIds,
  NotificationType,
} from '@mykwatta/modules/notifications/constants';
import type {
  NotificationEmailPayload,
  NotificationMessagePayload,
} from '@mykwatta/shared/queue';
import { NotificationProducer } from './notification.producer';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  /** Resource ids used to build `metadata.href` + enrich push payloads. */
  resources?: NotificationResourceIds;
  /** Optional EMAIL channel content (delivered async if prefs allow). */
  email?: NotificationEmailPayload;
  /** Optional WHATSAPP channel content. */
  whatsapp?: NotificationMessagePayload;
  /** Optional SMS channel content. */
  sms?: NotificationMessagePayload;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly producer: NotificationProducer,
  ) {}

  /**
   * Fire-and-forget: enqueues a notification event and returns immediately.
   * Delivery (in-app, push, email, WhatsApp, SMS) runs on the worker.
   */
  notify(input: CreateNotificationInput): void {
    void this.producer.enqueue(input).then((jobId) => {
      if (!jobId) {
        this.logger.warn(
          `Notification event dropped type=${input.type} user=${input.userId}`,
        );
      }
    });
  }

  async listMine(
    userId: string,
    query: { page: number; limit: number; unreadOnly?: boolean },
  ) {
    try {
      const filters = [eq(notifications.userId, userId)];
      if (query.unreadOnly) {
        filters.push(isNull(notifications.readAt));
      }
      const whereClause = and(...filters);
      const offset = (query.page - 1) * query.limit;

      const [rows, countRow] = await Promise.all([
        this.db.query.notifications.findMany({
          where: whereClause,
          orderBy: [desc(notifications.createdAt)],
          limit: query.limit,
          offset,
        }),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(notifications)
          .where(whereClause),
      ]);

      return {
        data: rows,
        meta: {
          page: query.page,
          limit: query.limit,
          total: countRow[0]?.count ?? 0,
        },
      };
    } catch (error) {
      throw AppException.database('Failed to list notifications', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async unreadCount(userId: string) {
    try {
      const [row] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.readAt)),
        );
      return { unread: row?.count ?? 0 };
    } catch (error) {
      throw AppException.database('Failed to count unread notifications', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async markRead(notificationId: string, userId: string) {
    try {
      const row = await this.db.query.notifications.findFirst({
        where: eq(notifications.id, notificationId),
      });
      if (!row || row.userId !== userId) {
        throw AppException.notFound('Notification not found');
      }
      if (!row.readAt) {
        await this.db
          .update(notifications)
          .set({ readAt: new Date() })
          .where(eq(notifications.id, notificationId));
      }
      return this.db.query.notifications.findFirst({
        where: eq(notifications.id, notificationId),
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to mark notification read', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async markAllRead(userId: string) {
    try {
      await this.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.readAt)),
        );
      return this.unreadCount(userId);
    } catch (error) {
      throw AppException.database('Failed to mark all notifications read', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
