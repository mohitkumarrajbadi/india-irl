/**
 * Rapier material tunables — road feel + anti-slide.
 * Applied at collider cook time (chunks / spawn).
 */

/** Asphalt / road surface — grippy, almost no bounce. */
export const ROAD_FRICTION = 1.45;
export const ROAD_RESTITUTION = 0.02;

/** Building / curb walls. */
export const WALL_FRICTION = 0.75;
export const WALL_RESTITUTION = 0.04;

/** Dynamic chassis cuboid. */
export const VEHICLE_FRICTION = 0.95;
export const VEHICLE_RESTITUTION = 0.05;

/** Kinematic capsule. */
export const CHAR_FRICTION = 0.85;
export const CHAR_RESTITUTION = 0.0;

/** Soft infinite underlay under streamed road trimeshes. */
export const GROUND_FRICTION = 1.2;
export const GROUND_RESTITUTION = 0.0;

/** If translation.y falls below this, snap back to last valid pose. */
export const KILL_PLANE_Y = -100;

/** Road surface slab thickness (visual Y=0 aligns to slab top). */
export const ROAD_SURFACE_Y = 0;
export const ROAD_SLAB_HALF_Y = 0.06;
