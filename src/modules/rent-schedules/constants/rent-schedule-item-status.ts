export enum RentScheduleItemStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
}

export const RENT_SCHEDULE_ITEM_STATUSES = Object.values(
  RentScheduleItemStatus,
) as [RentScheduleItemStatus, ...RentScheduleItemStatus[]];
