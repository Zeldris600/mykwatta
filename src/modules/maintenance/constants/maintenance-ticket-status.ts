export enum MaintenanceTicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export const MAINTENANCE_TICKET_STATUSES = Object.values(
  MaintenanceTicketStatus,
) as [MaintenanceTicketStatus, ...MaintenanceTicketStatus[]];
