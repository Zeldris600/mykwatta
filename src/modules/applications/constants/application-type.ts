export enum ApplicationType {
  RENTAL_APPLICATION = 'RENTAL_APPLICATION',
  PURCHASE_OFFER = 'PURCHASE_OFFER',
}

export const APPLICATION_TYPES = Object.values(ApplicationType) as [
  ApplicationType,
  ...ApplicationType[],
];
