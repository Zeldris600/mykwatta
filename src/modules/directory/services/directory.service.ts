import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, type SQL } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { directoryProfessionals } from '@mykwatta/core/database/schema/directory-professionals.schema';
import type {
  CreateProfessionalDto,
  ListProfessionalsQueryDto,
  UpdateProfessionalDto,
} from '@mykwatta/modules/directory/dto';
import { IdentityService } from '@mykwatta/modules/identity/services';

@Injectable()
export class DirectoryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identity: IdentityService,
  ) {}

  async listPublic(query: ListProfessionalsQueryDto) {
    try {
      const filters: SQL[] = [];
      if (query.city) {
        filters.push(ilike(directoryProfessionals.city, `%${query.city.trim()}%`));
      }
      if (query.kind) {
        filters.push(eq(directoryProfessionals.kind, query.kind));
      }
      const whereClause = filters.length > 0 ? and(...filters) : undefined;
      return await this.db
        .select()
        .from(directoryProfessionals)
        .where(whereClause)
        .orderBy(asc(directoryProfessionals.name));
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to list professionals', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listForAdmin(adminUserId: string) {
    await this.identity.assertPlatformAdmin(adminUserId);
    return this.db
      .select()
      .from(directoryProfessionals)
      .orderBy(asc(directoryProfessionals.name));
  }

  async create(adminUserId: string, input: CreateProfessionalDto) {
    await this.identity.assertPlatformAdmin(adminUserId);
    try {
      const id = createId();
      await this.db.insert(directoryProfessionals).values({
        id,
        kind: input.kind,
        name: input.name.trim(),
        city: input.city.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        verified: input.verified ?? false,
      });
      return this.requireOne(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to create professional', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async update(id: string, adminUserId: string, input: UpdateProfessionalDto) {
    await this.identity.assertPlatformAdmin(adminUserId);
    await this.requireOne(id);
    try {
      await this.db
        .update(directoryProfessionals)
        .set({
          ...(input.kind !== undefined ? { kind: input.kind } : {}),
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.city !== undefined ? { city: input.city.trim() } : {}),
          ...(input.phone !== undefined
            ? { phone: input.phone?.trim() || null }
            : {}),
          ...(input.email !== undefined
            ? { email: input.email?.trim().toLowerCase() || null }
            : {}),
          ...(input.verified !== undefined ? { verified: input.verified } : {}),
        })
        .where(eq(directoryProfessionals.id, id));
      return this.requireOne(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to update professional', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async remove(id: string, adminUserId: string) {
    await this.identity.assertPlatformAdmin(adminUserId);
    await this.requireOne(id);
    await this.db
      .delete(directoryProfessionals)
      .where(eq(directoryProfessionals.id, id));
    return { deleted: true, id };
  }

  private async requireOne(id: string) {
    const row = await this.db.query.directoryProfessionals.findFirst({
      where: eq(directoryProfessionals.id, id),
    });
    if (!row) {
      throw AppException.notFound('Professional not found');
    }
    return row;
  }
}
