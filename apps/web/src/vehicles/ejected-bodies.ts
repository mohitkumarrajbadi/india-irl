/**
 * Lightweight thrown rider/pillion bodies after bike smash — arcade impulse, not ragdoll.
 */
export type EjectedBody = {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  life: number;
  maxLife: number;
};

const MAX = 24;

export class EjectedBodyPool {
  readonly bodies: EjectedBody[] = [];

  constructor() {
    for (let i = 0; i < MAX; i += 1) {
      this.bodies.push({
        alive: false,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spin: 0,
        life: 0,
        maxLife: 1,
      });
    }
  }

  spawn(x: number, z: number, yaw: number, nx: number, nz: number, severity: number, side = 0): void {
    const b = this.take();
    if (!b) return;
    const inv = 1 / (Math.hypot(nx, nz) || 1);
    const throwV = 4 + severity * 10;
    const sideSin = Math.cos(yaw) * side;
    const sideCos = -Math.sin(yaw) * side;
    b.alive = true;
    b.x = x + sideSin * 0.35;
    b.y = 0.7;
    b.z = z + sideCos * 0.35;
    b.yaw = yaw + (Math.random() - 0.5) * 0.8;
    b.vx = -nx * inv * throwV + sideSin * (2 + severity * 3) + (Math.random() - 0.5) * 2;
    b.vz = -nz * inv * throwV + sideCos * (2 + severity * 3) + (Math.random() - 0.5) * 2;
    b.vy = 2.8 + severity * 3.5;
    b.spin = (Math.random() - 0.5) * (6 + severity * 10);
    b.life = 0;
    b.maxLife = 2.4 + severity * 1.2;
  }

  private take(): EjectedBody | null {
    let oldest: EjectedBody | null = null;
    let oldestRemain = Infinity;
    for (const b of this.bodies) {
      if (!b.alive) return b;
      const remain = b.maxLife - b.life;
      if (remain < oldestRemain) {
        oldestRemain = remain;
        oldest = b;
      }
    }
    return oldest;
  }

  tick(dt: number): void {
    for (const b of this.bodies) {
      if (!b.alive) continue;
      b.life += dt;
      b.vy -= 14 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.yaw += b.spin * dt * 0.35;
      b.spin *= Math.exp(-1.8 * dt);
      b.vx *= Math.exp(-1.4 * dt);
      b.vz *= Math.exp(-1.4 * dt);
      if (b.y < 0.12) {
        b.y = 0.12;
        b.vy *= -0.2;
        b.vx *= 0.65;
        b.vz *= 0.65;
      }
      if (b.life >= b.maxLife) b.alive = false;
    }
  }
}
