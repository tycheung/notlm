export const TD_HOME_COMING_UP_DAYS = 10;

export type TdHomeEventLike = {
  id: number;
  name: string;
  tournament_id: number;
  start_date: string;
  end_date: string;
};

export function localDateOnly(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function naiveDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + days);
  return localDateOnly(next);
}

export function eventIsHappeningOnDate(event: TdHomeEventLike, dateOnly: string): boolean {
  const start = naiveDateOnly(event.start_date);
  const end = naiveDateOnly(event.end_date);
  return start <= dateOnly && dateOnly <= end;
}

export function eventStartsInComingUpWindow(
  event: TdHomeEventLike,
  today: string,
  daysAhead: number = TD_HOME_COMING_UP_DAYS
): boolean {
  if (eventIsHappeningOnDate(event, today)) {
    return false;
  }
  const start = naiveDateOnly(event.start_date);
  const first = addDaysToDateOnly(today, 1);
  const last = addDaysToDateOnly(today, daysAhead);
  return start >= first && start <= last;
}

function compareHomeEvents(a: TdHomeEventLike, b: TdHomeEventLike): number {
  const startCmp = naiveDateOnly(a.start_date).localeCompare(naiveDateOnly(b.start_date));
  if (startCmp !== 0) return startCmp;
  return a.name.localeCompare(b.name);
}

export function bucketTdHomeEvents(
  events: TdHomeEventLike[],
  managedTournamentIds: Iterable<number>,
  today: string = localDateOnly()
): { happeningToday: TdHomeEventLike[]; comingUp: TdHomeEventLike[] } {
  const managed = new Set(managedTournamentIds);
  const mine = events.filter((event) => managed.has(event.tournament_id));
  return {
    happeningToday: mine.filter((event) => eventIsHappeningOnDate(event, today)).sort(compareHomeEvents),
    comingUp: mine.filter((event) => eventStartsInComingUpWindow(event, today)).sort(compareHomeEvents),
  };
}
