export enum PaymentChannel {
  /** Cameroon MTN MoMo / Orange Money via Fapshi. */
  MOBILE_MONEY = 'MOBILE_MONEY',
  /** International cards via Stripe. */
  CARD = 'CARD',
}

export const PAYMENT_CHANNELS = Object.values(PaymentChannel) as [
  PaymentChannel,
  ...PaymentChannel[],
];
