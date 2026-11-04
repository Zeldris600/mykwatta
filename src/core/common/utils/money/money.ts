import { CurrencyCode, CURRENCIES, DEFAULT_CURRENCY } from './currency';

export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export function money(
  amountMinor: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new Error('Money amounts must be integers in the smallest unit');
  }
  if (!CURRENCIES[currency]) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return { amountMinor, currency };
}
