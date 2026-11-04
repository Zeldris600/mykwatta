export enum PaymentProviderName {
  CONSOLE = 'CONSOLE',
  FAPSHI = 'FAPSHI',
  STRIPE = 'STRIPE',
}

export const PAYMENT_PROVIDER_NAMES = Object.values(PaymentProviderName) as [
  PaymentProviderName,
  ...PaymentProviderName[],
];
