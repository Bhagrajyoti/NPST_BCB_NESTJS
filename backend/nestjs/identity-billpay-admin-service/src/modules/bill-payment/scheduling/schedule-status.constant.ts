export enum ScheduleStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED',
}

export const TERMINAL_SCHEDULE_STATUSES: ScheduleStatus[] = [
  ScheduleStatus.CANCELLED,
  ScheduleStatus.EXPIRED,
  ScheduleStatus.COMPLETED,
];
