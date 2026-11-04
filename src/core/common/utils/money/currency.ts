export enum CurrencyCode {
  XAF = 'XAF',
  USD = 'USD',
  EUR = 'EUR',
}

export interface CurrencyMeta {
  code: CurrencyCode;
  decimalPlaces: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  [CurrencyCode.XAF]: { code: CurrencyCode.XAF, decimalPlaces: 0 },
  [CurrencyCode.USD]: { code: CurrencyCode.USD, decimalPlaces: 2 },
  [CurrencyCode.EUR]: { code: CurrencyCode.EUR, decimalPlaces: 2 },
};

export const DEFAULT_CURRENCY = CurrencyCode.XAF;
