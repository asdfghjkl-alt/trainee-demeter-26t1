// Shared constants that are safe to import in both server and client code.
// Do NOT import mongoose or any server-only modules here.

export const TRANSPORTATION_MODES = [
  "transit",
  "driving",
  "cycling",
  "walking",
] as const;

export type TransportationMode = (typeof TRANSPORTATION_MODES)[number];
