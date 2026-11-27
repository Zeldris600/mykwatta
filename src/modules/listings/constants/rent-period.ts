/** How the listed rent is quoted (student market often annual / academic year). */
export enum RentPeriod {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
  ACADEMIC_YEAR = 'ACADEMIC_YEAR',
}

export const RENT_PERIODS = Object.values(RentPeriod) as [
  RentPeriod,
  ...RentPeriod[],
];
