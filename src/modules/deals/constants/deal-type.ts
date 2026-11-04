export enum DealType {
  LEASE = 'LEASE',
  SALE_AGREEMENT = 'SALE_AGREEMENT',
}

export const DEAL_TYPES = Object.values(DealType) as [DealType, ...DealType[]];
