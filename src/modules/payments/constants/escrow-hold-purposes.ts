import { PaymentPurpose } from './payment-purpose';

/** Payment purposes that create an internal escrow hold on success. */
export const ESCROW_HOLD_PAYMENT_PURPOSES: readonly PaymentPurpose[] = [
  PaymentPurpose.LISTING_DEPOSIT,
];

export function isEscrowHoldPurpose(purpose: PaymentPurpose): boolean {
  return (ESCROW_HOLD_PAYMENT_PURPOSES as readonly string[]).includes(purpose);
}
