import { get, post, del } from "@/lib/api";
import type { Schedule } from "@/types";

/** Fetch all active schedules for the current user. */
export function listSchedules(): Promise<Schedule[]> {
  return get<Schedule[]>("schedules");
}

/** Create a recurring analysis schedule. */
export function createSchedule(
  brand: string,
  competitors: string[],
  models: string[],
  intervalDays: number,
): Promise<Schedule> {
  return post<Schedule>("schedules", { brand, competitors, models, interval_days: intervalDays });
}

/** Cancel (soft-delete) a schedule. */
export function removeSchedule(id: string): Promise<{ ok: boolean }> {
  return del<{ ok: boolean }>(`schedules/${id}`);
}
