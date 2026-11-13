/** One-shot IMPACT from the sim worker for arcade crash feedback. */

export type DriveImpact = {
  fx: number;
  fz: number;
  speed: number;
};

let pending: DriveImpact | null = null;

export function noteDriveImpact(fx: number, fz: number, speed: number): void {
  pending = { fx, fz, speed };
}

/** Drain latest impact (at most one). */
export function takeDriveImpact(): DriveImpact | null {
  const p = pending;
  pending = null;
  return p;
}
