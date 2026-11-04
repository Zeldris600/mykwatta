import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { pushDevices } from '@mykwatta/core/database/schema/push-devices.schema';
import type { PushPlatform } from '@mykwatta/modules/notifications/constants';

@Injectable()
export class PushDevicesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async register(input: {
    userId: string;
    platform: PushPlatform;
    token: string;
    deviceId?: string;
  }) {
    try {
      const token = input.token.trim();
      const now = new Date();
      const existing = await this.db.query.pushDevices.findFirst({
        where: eq(pushDevices.token, token),
      });

      if (existing) {
        const [updated] = await this.db
          .update(pushDevices)
          .set({
            userId: input.userId,
            platform: input.platform,
            deviceId: input.deviceId?.trim() || existing.deviceId,
            updatedAt: now,
          })
          .where(eq(pushDevices.id, existing.id))
          .returning();
        return updated;
      }

      if (input.deviceId?.trim()) {
        await this.db
          .delete(pushDevices)
          .where(
            and(
              eq(pushDevices.userId, input.userId),
              eq(pushDevices.deviceId, input.deviceId.trim()),
            ),
          );
      }

      const [created] = await this.db
        .insert(pushDevices)
        .values({
          id: createId(),
          userId: input.userId,
          platform: input.platform,
          token,
          deviceId: input.deviceId?.trim() || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return created;
    } catch (error) {
      throw AppException.database('Failed to register push device', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async unregister(userId: string, token: string) {
    try {
      await this.db
        .delete(pushDevices)
        .where(
          and(
            eq(pushDevices.userId, userId),
            eq(pushDevices.token, token.trim()),
          ),
        );
      return { ok: true };
    } catch (error) {
      throw AppException.database('Failed to unregister push device', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMine(userId: string) {
    try {
      return this.db.query.pushDevices.findMany({
        where: eq(pushDevices.userId, userId),
        orderBy: [desc(pushDevices.updatedAt)],
      });
    } catch (error) {
      throw AppException.database('Failed to list push devices', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listTargetsForUser(userId: string) {
    return this.db.query.pushDevices.findMany({
      where: eq(pushDevices.userId, userId),
      columns: { platform: true, token: true },
    });
  }

  async removeTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }
    try {
      await this.db
        .delete(pushDevices)
        .where(inArray(pushDevices.token, tokens));
    } catch {
      // best-effort prune; notify path must not fail on cleanup
    }
  }
}
