import type { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import type {
  DepositAvailabilityReason,
  DepositAvailabilityStatus,
} from '@mykwatta/modules/payments/constants/deposit-availability';

export type DepositAvailability = {
  status: DepositAvailabilityStatus;
  /** Why checkout is blocked or resumed; null when AVAILABLE. */
  reason: DepositAvailabilityReason | null;
  /** Human-readable copy for toasts / banners. */
  message: string;
  /** Full listing deposit due (same as GET /payments/quotes/deposit total). */
  requiredAmountMinor: number;
  currency: CurrencyCode;
  /**
   * Existing payment to resume (OPEN_CHECKOUT) or the succeeded deposit (PAID).
   */
  paymentId: string | null;
  /** True only when FE may call POST /payments/deposits to start a new checkout. */
  canStartCheckout: boolean;
};
