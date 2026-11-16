/**
 * Soft toy / Memoji-language vehicles — rounded silicone bodies, chrome accents,
 * rubber tires. Indian silhouettes (auto nose, truck art, RHD seating).
 */
export type { BuildOpts, Model } from "./model-parts";
export { glassMaterial } from "./model-parts";
export { buildAuto, buildBike, buildBikePillion } from "./model-light";
export { buildBus, buildCar, buildTruck } from "./model-heavy";
export {
  buildERickshaw,
  buildJeep,
  buildMotorcycle,
  buildSuv,
  buildTaxi,
  buildTempo,
  buildVan,
} from "./model-extra";