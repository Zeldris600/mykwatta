export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export const APPOINTMENT_STATUSES = Object.values(AppointmentStatus) as [
  AppointmentStatus,
  ...AppointmentStatus[],
];
