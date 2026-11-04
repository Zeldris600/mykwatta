export enum EscrowStatus {
  HELD = 'HELD',
  RELEASED_TO_OWNER = 'RELEASED_TO_OWNER',
  REFUNDED_TO_PAYER = 'REFUNDED_TO_PAYER',
}

export const ESCROW_STATUSES = Object.values(EscrowStatus) as [
  EscrowStatus,
  ...EscrowStatus[],
];
