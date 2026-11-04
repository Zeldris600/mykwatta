export enum AppointmentModality {
  IN_PERSON = 'IN_PERSON',
  VIRTUAL = 'VIRTUAL',
}

export const APPOINTMENT_MODALITIES = Object.values(AppointmentModality) as [
  AppointmentModality,
  ...AppointmentModality[],
];
