// Date helpers shared across modules.

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}
