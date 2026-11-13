/** Local driver chassis id in the sim worker (Phase B). */
export const LOCAL_DRIVER_ID = 1;
export const LOCAL_VEHICLE_ID = 100;

/** Kinds that use Rapier when `rapierDrive` is on. */
export const RAPIER_DRIVE_KINDS = new Set<number>([1, 2, 3]);

export function isRapierDriveKind(kind: number): boolean {
  return RAPIER_DRIVE_KINDS.has(kind);
}
