import { Inject, Injectable, Logger } from '@nestjs/common';
import { desc, eq, or } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { escrowLedger } from '@mykwatta/core/database/schema/escrow.schema';
import type { payments } from '@mykwatta/core/database/schema/payments.schema';
import { EscrowStatus } from '@mykwatta/modules/escrow/constants';
import { Persona } from '@mykwatta/modules/identity/constants';
import { IdentityService } from '@mykwatta/modules/identity/services';
import { ListingsService } from '@mykwatta/modules/listings/services';
import { isEscrowHoldPurpose } from '@mykwatta/modules/payments/constants';

type PaymentRow = typeof payments.$inferSelect;

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listings: ListingsService,
    private readonly identity: IdentityService,
  ) {}

  async holdFromPayment(payment: PaymentRow): Promise<void> {
    if (!isEscrowHoldPurpose(payment.purpose)) {
      return;
    }

    const existing = await this.db.query.escrowLedger.findFirst({
      where: eq(escrowLedger.paymentId, payment.id),
    });
    if (existing) {
      return;
    }

    let beneficiaryUserId: string | null = null;
    if (payment.listingId) {
      const listing = await this.listings.getById(payment.listingId);
      beneficiaryUserId = listing.ownerUserId;
    }

    const id = createId();
    try {
      await this.db.insert(escrowLedger).values({
        id,
        paymentId: payment.id,
        listingId: payment.listingId ?? null,
        payerUserId: payment.userId,
        beneficiaryUserId,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        status: EscrowStatus.HELD,
        heldAt: payment.paidAt ?? new Date(),
      });
    } catch (error) {
      this.logger.error(
        `escrow hold failed paymentId=${payment.id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to hold payment in escrow', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMine(userId: string) {
    try {
      return await this.db.query.escrowLedger.findMany({
        where: or(
          eq(escrowLedger.payerUserId, userId),
          eq(escrowLedger.beneficiaryUserId, userId),
        ),
        orderBy: [desc(escrowLedger.createdAt)],
      });
    } catch (error) {
      throw AppException.database('Failed to list escrow entries', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listAdmin(adminUserId: string) {
    await this.assertPlatformAdmin(adminUserId);
    try {
      return await this.db.query.escrowLedger.findMany({
        orderBy: [desc(escrowLedger.createdAt)],
      });
    } catch (error) {
      throw AppException.database('Failed to list escrow entries', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async release(ledgerId: string, actorUserId: string, reason?: string) {
    const ledger = await this.getLedgerOrThrow(ledgerId);
    await this.assertCanActOnEscrow(ledger, actorUserId);

    if (ledger.status !== EscrowStatus.HELD) {
      throw AppException.badRequest('Escrow entry is not in HELD status');
    }

    await this.db
      .update(escrowLedger)
      .set({
        status: EscrowStatus.RELEASED_TO_OWNER,
        releasedAt: new Date(),
        releaseReason: reason?.trim() || null,
      })
      .where(eq(escrowLedger.id, ledgerId));

    return this.getLedgerOrThrow(ledgerId);
  }

  async refund(ledgerId: string, actorUserId: string, reason?: string) {
    const ledger = await this.getLedgerOrThrow(ledgerId);
    await this.assertCanActOnEscrow(ledger, actorUserId);

    if (ledger.status !== EscrowStatus.HELD) {
      throw AppException.badRequest('Escrow entry is not in HELD status');
    }

    await this.db
      .update(escrowLedger)
      .set({
        status: EscrowStatus.REFUNDED_TO_PAYER,
        refundedAt: new Date(),
        releaseReason: reason?.trim() || null,
      })
      .where(eq(escrowLedger.id, ledgerId));

    return this.getLedgerOrThrow(ledgerId);
  }

  private async getLedgerOrThrow(ledgerId: string) {
    const ledger = await this.db.query.escrowLedger.findFirst({
      where: eq(escrowLedger.id, ledgerId),
    });
    if (!ledger) {
      throw AppException.notFound(`Escrow entry ${ledgerId} not found`);
    }
    return ledger;
  }

  private async assertCanActOnEscrow(
    ledger: typeof escrowLedger.$inferSelect,
    actorUserId: string,
  ): Promise<void> {
    const personas = await this.identity.listPersonasForUser(actorUserId);
    if (personas.includes(Persona.PLATFORM_ADMIN)) {
      return;
    }
    if (ledger.beneficiaryUserId && ledger.beneficiaryUserId === actorUserId) {
      return;
    }
    throw AppException.forbidden(
      'Only the listing owner or a platform admin can release or refund escrow',
    );
  }

  private async assertPlatformAdmin(userId: string): Promise<void> {
    const personas = await this.identity.listPersonasForUser(userId);
    if (!personas.includes(Persona.PLATFORM_ADMIN)) {
      throw AppException.forbidden('Platform admin persona required');
    }
  }
}
