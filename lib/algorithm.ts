/**
 * lib/algorithm.ts
 *
 * Isochrone-intersection location recommendation algorithm.
 *
 * Pipeline:
 *  1. For each participant, fetch a GeoJSON isochrone polygon from the Mapbox
 *     Isochrone API, using their transport mode and the configured time budget.
 *  2. Progressively intersect all polygons with @turf/intersect.
 *     If the intersection is empty (participants too far apart), fall back to
 *     the isochrone of the least-mobile participant (smallest area).
 *  3. Compute the centroid of the surviving polygon.
 *  4. Search for POIs near that centroid via Mapbox Search Box, one query per
 *     room category.
 *  5. Score every candidate by building a travel-time matrix (Mapbox Directions
 *     for driving/cycling/walking; TfNSW for transit) and applying a composite
 *     penalty function that minimises the worst case, mean, and variance.
 *  6. Return the top 5 deduplicated, scored candidates.
 */

import intersect from "@turf/intersect";
import centroid from "@turf/centroid";
import area from "@turf/area";
import buffer from "@turf/buffer";
import { featureCollection } from "@turf/helpers";

import type { Feature, Polygon, MultiPolygon } from "geojson";
import type { TransportationMode } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParticipantCoord {
  latitude: number;
  longitude: number;
  transportationMode: TransportationMode;
}

export interface CandidateLocation {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  category?: string;
  mapboxId?: string;
}

export interface ScoredLocation extends CandidateLocation {
  /** Travel time in minutes for each participant (same order as input array) */
  travelMinutes: number[];
  maxMinutes: number;
  meanMinutes: number;
  stddevMinutes: number;
  /** Lower is better – composite penalty */
  score: number;
}

// ---------------------------------------------------------------------------
// Transport-mode helpers
// ---------------------------------------------------------------------------

/** Maps an app transport mode to the Mapbox Directions / Isochrone profile. */
function toMapboxProfile(
  mode: TransportationMode,
): "driving-traffic" | "cycling" | "walking" {
  switch (mode) {
    case "driving":
      return "driving-traffic";
    case "cycling":
    case "walking":
      return "walking";
    case "transit":
      // For isochrones, cycling speed (~15km/h) is a much better geographical approximation 
      // of average door-to-door urban transit speed than walking.
      return "cycling";
  }
}

/** Multiplier applied to the budget for transit participants' isochrone. */
const TRANSIT_ISOCHRONE_MULTIPLIER = 1.2;

// ---------------------------------------------------------------------------
// Step 1 – Fetch isochrone polygon from Mapbox
// ---------------------------------------------------------------------------

/**
 * Fetches a reachable-area polygon from the Mapbox Isochrone API.
 *
 * Transit participants use a walking profile with 2× the time budget as a
 * proxy, because TfNSW does not expose an isochrone endpoint.
 */
export async function getIsochrone(
  participant: ParticipantCoord,
  budgetMinutes: number,
  mapboxToken: string,
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const profile = toMapboxProfile(participant.transportationMode);
  const rawMinutes =
    participant.transportationMode === "transit"
      ? budgetMinutes * TRANSIT_ISOCHRONE_MULTIPLIER
      : budgetMinutes;

  // Mapbox Isochrone API limits contours_minutes to a maximum of 60.
  const fetchMinutes = Math.min(rawMinutes, 60);
  const excessMinutes = rawMinutes > 60 ? rawMinutes - 60 : 0;

  const url =
    `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/` +
    `${participant.longitude},${participant.latitude}` +
    `?contours_minutes=${fetchMinutes}&polygons=true&access_token=${mapboxToken}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        `Mapbox Isochrone API error ${res.status} for participant at ` +
          `${participant.latitude},${participant.longitude}`,
      );
      return null;
    }
    const data = await res.json();
    const features: Feature<Polygon | MultiPolygon>[] = data.features ?? [];
    // The API returns contours sorted largest-to-smallest; we want the outermost
    let poly = features[0] ?? null;

    if (poly && excessMinutes > 0) {
      // Approximate the extra time by buffering the 60-minute polygon.
      // Speeds (km/h) -> km/min: Walking (5 km/h) = ~0.083, Cycling (15 km/h) = 0.25, Driving (40 km/h) = 0.67
      let speedKmPerMin = 0.083; // default to walking/transit
      if (participant.transportationMode === "cycling") speedKmPerMin = 0.25;
      if (participant.transportationMode === "driving") speedKmPerMin = 0.67;

      const bufferDistanceKm = excessMinutes * speedKmPerMin;
      // @turf/buffer expects Geometry/Feature; cast poly as any
      poly = buffer(poly as any, bufferDistanceKm, { units: "kilometers" }) as Feature<Polygon | MultiPolygon>;
    }

    return poly;
  } catch (err) {
    console.error("Failed to fetch isochrone:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 2 – Intersect all isochrones (with fallback)
// ---------------------------------------------------------------------------

/**
 * Progressively intersects an array of GeoJSON polygons.
 *
 * If at any point the intersection becomes null (no common area), falls back
 * to the polygon with the smallest area (the least-mobile participant's zone).
 */
export function intersectIsochrones(
  polygons: Feature<Polygon | MultiPolygon>[],
): { polygon: Feature<Polygon | MultiPolygon>; usedFallback: boolean } {
  if (polygons.length === 0) {
    throw new Error("No isochrone polygons provided");
  }
  if (polygons.length === 1) {
    return { polygon: polygons[0], usedFallback: false };
  }

  let result: Feature<Polygon | MultiPolygon> | null = polygons[0];
  let usedFallback = false;

  for (let i = 1; i < polygons.length; i++) {
    const next = polygons[i];
    try {
      // @turf/intersect expects Feature<Polygon> pairs; cast as any for
      // MultiPolygon support (library handles it internally).
      const intersection = intersect(
        featureCollection([result, next] as any),
      ) as Feature<Polygon | MultiPolygon> | null;

      if (intersection) {
        result = intersection;
      } else {
        // Intersection is empty
        usedFallback = true;
        console.warn(
          "Isochrone intersection empty at step %d, falling back to smallest polygon",
          i,
        );
        const areaResult = area(result);
        const areaNext = area(next);
        result = areaResult < areaNext ? result : next;
      }
    } catch {
      // If turf throws (e.g. invalid geometry), keep current result
      console.warn("Turf intersect failed at step %d, skipping", i);
    }
  }

  return { polygon: result!, usedFallback };
}

// ---------------------------------------------------------------------------
// Step 3 – Centroid of intersection polygon
// ---------------------------------------------------------------------------

export function getSearchCenter(
  polygon: Feature<Polygon | MultiPolygon>,
): { lat: number; lng: number } {
  const c = centroid(polygon as any);
  const [lng, lat] = c.geometry.coordinates;
  return { lat, lng };
}

// ---------------------------------------------------------------------------
// Step 4 – Search POIs via Mapbox Search Box
// ---------------------------------------------------------------------------

/** Maps room category names to Mapbox search query strings. */
const CATEGORY_TO_QUERY: Record<string, string> = {
  Restaurants: "restaurant",
  Cafes: "cafe",
  Bars: "bar",
  Parks: "park",
  Libraries: "library",
  Shopping: "shopping",
  Museums: "museum",
  Gyms: "gym",
  Cinemas: "cinema",
  Bakeries: "bakery",
};

function categoryToQuery(categoryName: string): string {
  return CATEGORY_TO_QUERY[categoryName] ?? categoryName.toLowerCase();
}

/**
 * Searches for candidate POIs near the given centers using Mapbox Search Box.
 * One request is made per category; results are deduplicated by name+address.
 */
export async function searchPOIs(
  centers: { lat: number; lng: number }[],
  categoryNames: string[],
  mapboxToken: string,
  limitPerCategory = 8,
): Promise<CandidateLocation[]> {
  const seen = new Set<string>();
  const results: CandidateLocation[] = [];

  await Promise.all(
    centers.map(async (center) => {
      await Promise.all(
        categoryNames.map(async (cat) => {
          const query = encodeURIComponent(categoryToQuery(cat));
          const url =
            `https://api.mapbox.com/search/searchbox/v1/forward` +
            `?q=${query}` +
            `&proximity=${center.lng},${center.lat}` +
            `&country=au` +
            `&limit=${limitPerCategory}` +
            `&access_token=${mapboxToken}`;

          try {
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            const features: any[] = data.features ?? [];

            for (const f of features) {
              const coords: [number, number] = f.geometry?.coordinates;
              if (!coords) continue;
              const [lng, lat] = coords;
              const address: string =
                f.properties?.place_formatted ??
                f.properties?.full_address ??
                f.properties?.address ??
                "";
              const name: string = f.properties?.name ?? "Unknown";
              const dedupeKey = `${name.toLowerCase()}|${address.toLowerCase()}`;

              if (seen.has(dedupeKey)) continue;
              seen.add(dedupeKey);

              results.push({
                name,
                description: address,
                latitude: lat,
                longitude: lng,
                category: cat,
                mapboxId: f.properties?.mapbox_id,
              });
            }
          } catch (err) {
            console.error("Mapbox search error:", err);
          }
        }),
      );
    }),
  );

  return results;
}

// ---------------------------------------------------------------------------
// Step 5a – Travel time: Mapbox Directions
// ---------------------------------------------------------------------------

async function getTravelTimeMapbox(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: "driving-traffic" | "cycling" | "walking",
  mapboxToken: string,
  date?: Date,
): Promise<number | null> {
  let url =
    `https://api.mapbox.com/directions/v5/mapbox/${mode}/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?access_token=${mapboxToken}&overview=false`;

  // Mapbox driving-traffic supports depart_at for future times
  if (mode === "driving-traffic" && date) {
    const now = new Date();
    // Only append if it's in the future
    if (date.getTime() > now.getTime()) {
      // Mapbox expects ISO8601 without milliseconds, e.g., 2020-11-20T14:30
      const departAt = date.toISOString().split(".")[0];
      url += `&depart_at=${departAt}`;
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const durationSec: number | undefined = data.routes?.[0]?.duration;
    return durationSec != null ? durationSec / 60 : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 5b – Travel time: TfNSW (transit)
// ---------------------------------------------------------------------------

async function getTravelTimeTfNSW(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  tfnswKey: string,
  date?: Date,
): Promise<number | null> {
  const targetDate = date ?? new Date();
  
  // TfNSW Trip Planner API v1
  const params = new URLSearchParams({
    outputFormat: "rapidJSON",
    coordOutputFormat: "EPSG:4326",
    depArrMacro: "dep",
    itdDate: formatTfNSWDate(targetDate),
    itdTime: formatTfNSWTime(targetDate),
    type_origin: "coord",
    name_origin: `${from.lng}:${from.lat}:EPSG:4326`,
    type_destination: "coord",
    name_destination: `${to.lng}:${to.lat}:EPSG:4326`,
    calcNumberOfTrips: "1",
    TfNSWSF: "1",
    version: "10.2.1.42",
  });

  const url = `https://api.transport.nsw.gov.au/v1/tp/trip?${params}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `apikey ${tfnswKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const journeys: any[] = data.journeys ?? [];
    if (journeys.length === 0) return null;

    // Take the first journey's total duration in minutes
    const legs: any[] = journeys[0].legs ?? [];
    if (legs.length === 0) return null;

    const firstDep: string = legs[0].origin?.departureTimeEstimated ?? legs[0].origin?.departureTimePlanned ?? "";
    const lastArr: string = legs[legs.length - 1].destination?.arrivalTimeEstimated ?? legs[legs.length - 1].destination?.arrivalTimePlanned ?? "";

    if (!firstDep || !lastArr) return null;
    const diffMs = new Date(lastArr).getTime() - new Date(firstDep).getTime();
    return diffMs > 0 ? diffMs / 60000 : null;
  } catch {
    return null;
  }
}

function formatTfNSWDate(d: Date): string {
  // YYYYMMDD
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function formatTfNSWTime(d: Date): string {
  // HHMM
  return d.toISOString().slice(11, 16).replace(":", "");
}

// ---------------------------------------------------------------------------
// Step 5 – Build travel-time matrix and score candidates
// ---------------------------------------------------------------------------

const FALLBACK_TRAVEL_TIME_MINUTES = 60; // used when a route cannot be computed

/**
 * For each candidate, computes travel times from every participant and derives
 * a composite score. Lower score = better (less penalty).
 */
export async function scoreCandidates(
  candidates: CandidateLocation[],
  participants: ParticipantCoord[],
  mapboxToken: string,
  meetingDirection: "to-venue" | "from-venue",
  date?: Date,
  tfnswKey?: string,
): Promise<ScoredLocation[]> {
  const scored: ScoredLocation[] = await Promise.all(
    candidates.map(async (c) => {
      const travelMinutes: number[] = await Promise.all(
        participants.map(async (p) => {
          let minutes: number | null = null;
          
          const origin = meetingDirection === "from-venue" ? { lat: c.latitude, lng: c.longitude } : { lat: p.latitude, lng: p.longitude };
          const destination = meetingDirection === "from-venue" ? { lat: p.latitude, lng: p.longitude } : { lat: c.latitude, lng: c.longitude };

          if (p.transportationMode === "transit" && tfnswKey) {
            minutes = await getTravelTimeTfNSW(
              origin,
              destination,
              tfnswKey,
              date,
            );
          }

          // Fallback: use Mapbox driving-traffic with a 1.5x penalty for transit if TfNSW fails
          if (minutes == null) {
            if (p.transportationMode === "transit") {
              const driveMinutes = await getTravelTimeMapbox(
                origin,
                destination,
                "driving-traffic",
                mapboxToken,
                date,
              );
              // In urban areas, transit typically takes ~1.5x longer door-to-door than driving
              minutes = driveMinutes != null ? driveMinutes * 1.5 : null;
            } else {
              const profile = toMapboxProfile(p.transportationMode);
              minutes = await getTravelTimeMapbox(
                origin,
                destination,
                profile,
                mapboxToken,
                date,
              );
            }
          }

          return minutes ?? FALLBACK_TRAVEL_TIME_MINUTES;
        }),
      );

      const maxMinutes = Math.max(...travelMinutes);
      const meanMinutes =
        travelMinutes.reduce((a, b) => a + b, 0) / travelMinutes.length;
      const variance =
        travelMinutes.reduce((sum, t) => sum + (t - meanMinutes) ** 2, 0) /
        travelMinutes.length;
      const stddevMinutes = Math.sqrt(variance);

      // Composite penalty: minimise worst case > mean > variance
      const score = -(0.5 * maxMinutes + 0.3 * meanMinutes + 0.2 * stddevMinutes);

      return { ...c, travelMinutes, maxMinutes, meanMinutes, stddevMinutes, score };
    }),
  );

  // Sort descending by score (less penalty = higher score)
  return scored.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Step 6 – Full pipeline
// ---------------------------------------------------------------------------

export interface GenerateLocationsResult {
  locations: CandidateLocation[];
  /** Human-readable warning if any participants were skipped. */
  warning?: string;
  /** True when the intersection was empty and a fallback zone was used. */
  usedFallback?: boolean;
}

/**
 * Main entry point: runs the full isochrone-intersection pipeline and returns
 * up to `topN` scored candidate locations.
 */
export async function generateLocations(opts: {
  participants: ParticipantCoord[];
  categoryNames: string[];
  travelBudgetMinutes: number;
  meetingDirection: "to-venue" | "from-venue";
  date?: Date;
  mapboxToken: string;
  tfnswKey?: string;
  topN?: number;
}): Promise<GenerateLocationsResult> {
  const {
    participants,
    categoryNames,
    travelBudgetMinutes,
    meetingDirection,
    date,
    mapboxToken,
    tfnswKey,
    topN = 5,
  } = opts;

  // --- Guard: need at least one participant with coordinates ---------------
  const validParticipants = participants.filter(
    (p) =>
      typeof p.latitude === "number" &&
      typeof p.longitude === "number" &&
      !isNaN(p.latitude) &&
      !isNaN(p.longitude),
  );

  const skipped = participants.length - validParticipants.length;
  const warning =
    skipped > 0
      ? `${skipped} of ${participants.length} participant(s) had no coordinates and were excluded from the algorithm.`
      : undefined;

  if (validParticipants.length === 0) {
    throw new Error(
      "No participants have location coordinates. Ask participants to re-enter their location.",
    );
  }

  // --- Step 1: Fetch isochrones --------------------------------------------
  const isochroneResults = await Promise.all(
    validParticipants.map((p) => getIsochrone(p, travelBudgetMinutes, mapboxToken)),
  );

  const validPolygons = isochroneResults.filter(
    (p): p is Feature<Polygon | MultiPolygon> => p !== null,
  );

  if (validPolygons.length === 0) {
    throw new Error("Could not fetch any isochrone polygons from Mapbox. Check your API token.");
  }

  // --- Step 2: Intersect ---------------------------------------------------
  let usedFallback = false;
  let intersected: Feature<Polygon | MultiPolygon>;

  if (validPolygons.length === 1) {
    intersected = validPolygons[0];
  } else {
    const res = intersectIsochrones(validPolygons);
    intersected = res.polygon;
    usedFallback = res.usedFallback;
  }

  // --- Step 3: Centroid ----------------------------------------------------
  // Calculate the geographic midpoint of all participants
  const avgLat = validParticipants.reduce((sum, p) => sum + p.latitude, 0) / validParticipants.length;
  const avgLng = validParticipants.reduce((sum, p) => sum + p.longitude, 0) / validParticipants.length;
  const geographicMidpoint = { lat: avgLat, lng: avgLng };

  const searchCenters = [geographicMidpoint];

  // If the isochrones successfully intersected, also search around the intersection centroid
  if (!usedFallback) {
    const intersectionCentroid = getSearchCenter(intersected);
    // Only add if it's reasonably distinct to avoid redundant API calls (e.g., >100m away)
    // For simplicity, we just add both and let deduplication handle it
    searchCenters.push(intersectionCentroid);
  }

  // --- Step 4: POI search --------------------------------------------------
  const candidates = await searchPOIs(searchCenters, categoryNames, mapboxToken);

  if (candidates.length === 0) {
    throw new Error(
      "No venues found near the meeting zone. Try selecting different categories or increasing the travel time budget.",
    );
  }

  // Shuffle candidates to ensure a mix of both search centers
  const shuffledCandidates = candidates.sort(() => 0.5 - Math.random());

  // --- Step 5: Score -------------------------------------------------------
  // Score the top 30 raw candidates to limit API calls while capturing a diverse pool
  const toScore = shuffledCandidates.slice(0, 30);
  const scored = await scoreCandidates(toScore, validParticipants, mapboxToken, meetingDirection, date, tfnswKey);

  return {
    locations: scored.slice(0, topN),
    warning,
    usedFallback,
  };
}
