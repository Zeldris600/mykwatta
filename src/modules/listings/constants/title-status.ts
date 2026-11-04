export enum TitleStatus {
  TITRE_FONCIER = 'TITRE_FONCIER',
  ACTE_DE_VENTE = 'ACTE_DE_VENTE',
  EN_COURS = 'EN_COURS',
  INDIVISION = 'INDIVISION',
  UNKNOWN = 'UNKNOWN',
}

export const TITLE_STATUSES = Object.values(TitleStatus) as [
  TitleStatus,
  ...TitleStatus[],
];
