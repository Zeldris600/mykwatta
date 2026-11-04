export enum ProfessionalKind {
  NOTAIRE = 'NOTAIRE',
  LAWYER = 'LAWYER',
}

export const PROFESSIONAL_KINDS = Object.values(ProfessionalKind) as [
  ProfessionalKind,
  ...ProfessionalKind[],
];
