import { and, count, eq, inArray } from 'drizzle-orm';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingDeals } from '@mykwatta/core/database/schema/deals.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { DealStatus, DealType } from '@mykwatta/modules/deals/constants';
import { ListingStatus, ListingType } from '@mykwatta/modules/listings/constants';

/**
 * Occupied rental units / total rentable units for an owner (published + under contract).
 * Returns null when the owner has no rentable units.
 */
export async function computeOccupancyPercentForOwner(
  db: DrizzleDb,
  ownerUserId: string,
): Promise<number | null> {
  const rentableStatuses = [ListingStatus.PUBLISHED, ListingStatus.UNDER_CONTRACT];

  const [totalRow] = await db
    .select({ value: count() })
    .from(listings)
    .where(
      and(
        eq(listings.ownerUserId, ownerUserId),
        eq(listings.listingType, ListingType.RENT),
        inArray(listings.status, rentableStatuses),
      ),
    );

  const totalUnits = Number(totalRow?.value ?? 0);
  if (totalUnits === 0) {
    return null;
  }

  const [occupiedRow] = await db
    .select({ value: count() })
    .from(listingDeals)
    .where(
      and(
        eq(listingDeals.ownerUserId, ownerUserId),
        eq(listingDeals.type, DealType.LEASE),
        eq(listingDeals.status, DealStatus.ACTIVE),
      ),
    );

  const occupied = Number(occupiedRow?.value ?? 0);
  return Math.min(100, Math.round((occupied / totalUnits) * 100));
}
