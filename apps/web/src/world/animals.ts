/** Live cow / dog / goat sim seeded from city prop placements. */
import { mulberry32, type Rng } from "../lib/rng.ts";
import { ANIMAL_INFO, type Animal, type AnimalKind } from "./animal-kinds.ts";
import { scareAnimalHorn, tickAnimal } from "./animal-tick.ts";
import type { CityData } from "./types.ts";

export type { Animal, AnimalKind } from "./animal-kinds.ts";
export { ANIMAL_INFO } from "./animal-kinds.ts";

export class AnimalSim {
  readonly animals: Animal[] = [];
  private readonly rng: Rng;

  constructor(city: CityData) {
    this.rng = mulberry32(city.config.seed ^ 0xa71_ca7);
    for (const c of city.cows) {
      // Village verge cows roam tighter; urban cows similar
      this.animals.push(this.make(0, c.x, c.z, c.rot, c.s, c.v, 10));
    }
    for (const s of city.strays) {
      const kind = (s.kind === 0 ? 1 : 2) as AnimalKind;
      // Dogs = urban roam; goats = short leash near village edge
      this.animals.push(this.make(kind, s.x, s.z, s.rot, s.s, s.v, kind === 1 ? 18 : 12));
    }
  }

  private make(
    kind: AnimalKind,
    x: number,
    z: number,
    yaw: number,
    scale: number,
    tint: number,
    leash: number,
  ): Animal {
    return {
      kind,
      tint,
      scale,
      x,
      z,
      yaw,
      speed: 0,
      phase: this.rng() * 10,
      mood: this.rng() < 0.4 ? "idle" : "roam",
      moodUntil: performance.now() + 1000 + this.rng() * 4000,
      tx: x + (this.rng() - 0.5) * 4,
      tz: z + (this.rng() - 0.5) * 4,
      hx: x,
      hz: z,
      leash,
    };
  }

  reactToHorn(x: number, z: number, now: number): void {
    for (const a of this.animals) scareAnimalHorn(a, x, z, now, this.rng);
  }

  /** Push near animals into traffic obstacle list. */
  pushObstacles(out: { x: number; z: number; r: number }[], px: number, pz: number, range = 55): void {
    const r2 = range * range;
    for (const a of this.animals) {
      const dx = a.x - px;
      const dz = a.z - pz;
      if (dx * dx + dz * dz > r2) continue;
      out.push({ x: a.x, z: a.z, r: ANIMAL_INFO[a.kind].radius });
    }
  }

  update(dt: number, px: number, pz: number, vehSpeed: number, now = performance.now()): void {
    const bubble2 = 200 * 200;
    for (const a of this.animals) {
      const dx = a.x - px;
      const dz = a.z - pz;
      if (dx * dx + dz * dz > bubble2) continue; // sleep far animals
      tickAnimal(a, dt, px, pz, now, this.rng, vehSpeed);
    }
  }
}
