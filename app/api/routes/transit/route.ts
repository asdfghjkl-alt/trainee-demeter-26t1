import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";

function formatSydneyDateTime(date: Date) {
  const optionsDate = {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  } as const;
  const optionsTime = {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  } as const;

  const dtfDate = new Intl.DateTimeFormat("en-AU", optionsDate);
  const dtfTime = new Intl.DateTimeFormat("en-AU", optionsTime);

  const dateParts = dtfDate.formatToParts(date);
  const timeParts = dtfTime.formatToParts(date);

  const day = dateParts.find((p) => p.type === "day")?.value || "";
  const month = dateParts.find((p) => p.type === "month")?.value || "";
  const year = dateParts.find((p) => p.type === "year")?.value || "";

  const hour = timeParts.find((p) => p.type === "hour")?.value || "";
  const minute = timeParts.find((p) => p.type === "minute")?.value || "";

  return {
    itdDate: `${year}${month}${day}`, // e.g. "20260522"
    itdTime: `${hour}${minute}`, // e.g. "1330"
  };
}

export const GET = apiHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const originLat = searchParams.get("originLat");
  const originLng = searchParams.get("originLng");
  const destLat = searchParams.get("destLat");
  const destLng = searchParams.get("destLng");
  let dateParam = searchParams.get("date");

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json(
      { message: "Missing required coordinates parameters" },
      { status: 400 },
    );
  }

  // Transit APIs typically fail if the requested date/time is in the past.
  // If the room was scheduled for the past, use the current time instead.
  if (dateParam) {
    const parsed = new Date(dateParam);
    if (!isNaN(parsed.getTime()) && parsed.getTime() < Date.now()) {
      dateParam = new Date().toISOString();
    }
  }

  const apiKey = process.env.TFNSW_API_KEY;
  const isKeyConfigured = apiKey && apiKey !== "your_tfnsw_api_key_here";

  if (isKeyConfigured) {
    try {
      const url = new URL("https://api.transport.nsw.gov.au/v1/tp/trip");
      url.searchParams.set("outputFormat", "rapidJSON");
      url.searchParams.set("coordOutputFormat", "EPSG:4326");
      url.searchParams.set("type_origin", "coord");
      url.searchParams.set(
        "name_origin",
        `${originLng}:${originLat}:EPSG:4326`,
      );
      url.searchParams.set("type_destination", "coord");
      url.searchParams.set(
        "name_destination",
        `${destLng}:${destLat}:EPSG:4326`,
      );
      url.searchParams.set("calcNumberOfTrips", "1");

      if (dateParam) {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          const { itdDate, itdTime } = formatSydneyDateTime(parsedDate);
          url.searchParams.set("itdDate", itdDate);
          url.searchParams.set("itdTime", itdTime);
          url.searchParams.set("depArrMacro", "dep");
        }
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `apikey ${apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const journey = data.journeys?.[0];
        if (journey && journey.legs && journey.legs.length > 0) {
          const legsData = [];
          const features = [];

          let totalDistance = 0;
          let walkingDistance = 0;
          let transitDistance = 0;

          // Compare departure and arrival times to get estimated duration
          const depTimeStr =
            journey.legs[0].origin?.departureTimeEstimated ||
            journey.legs[0].origin?.departureTimePlanned;
          const arrTimeStr =
            journey.legs[journey.legs.length - 1].destination
              ?.arrivalTimeEstimated ||
            journey.legs[journey.legs.length - 1].destination
              ?.arrivalTimePlanned;

          let duration = journey.duration || 0;
          if (depTimeStr && arrTimeStr) {
            const depTime = new Date(depTimeStr).getTime();
            const arrTime = new Date(arrTimeStr).getTime();
            if (!isNaN(depTime) && !isNaN(arrTime)) {
              duration = Math.max(0, Math.round((arrTime - depTime) / 1000));
            }
          }

          for (const leg of journey.legs) {
            totalDistance += leg.distance || 0;

            const rawCoords = leg.coords || [];
            const coords: [number, number][] = [];
            for (const c of rawCoords) {
              if (Array.isArray(c) && c.length >= 2) {
                let lat = c[0];
                let lng = c[1];
                // Swap coords if TfNSW returns [lat, lng] instead of [lng, lat]
                if (lat < 0 && lng > 0 && lat > -90 && lng < 180) {
                  // Correct order [lng, lat]
                } else if (lng < 0 && lat > 0 && lng > -90 && lat < 180) {
                  // Swapped order [lat, lng]
                  const temp = lat;
                  lat = lng;
                  lng = temp;
                }
                coords.push([lng, lat]);
              }
            }

            let mode = "transit";
            if (!leg.transportation) {
              mode = "walking";
            } else {
              const prodClass = Number(leg.transportation.product?.class);
              const prodName = String(
                leg.transportation.product?.name || "",
              ).toLowerCase();
              // Mapping derived from observed TfNSW responses:
              //   class 99 / 100, name "footpath" → walking
              //   class 1  Sydney Trains Network / Regional Trains and Coaches Network → train
              //   class 2  NSW TrainLink intercity → train
              //   class 5  Sydney Buses Network → bus
              //   class 7  Regional Coaches → bus
              //   class 4  Light Rail → tram
              //   class 9  Sydney Ferries → ferry
              // Sydney Metro shares class 1 with Sydney Trains, so it's identified by name.
              // Class is checked before name because the "Regional Trains and Coaches" name
              // is shared by class 1 (train) and class 7 (coach).
              if (
                prodName.includes("footpath") ||
                prodClass === 99 ||
                prodClass === 100
              ) {
                mode = "walking";
              } else if (prodName.includes("metro")) {
                mode = "metro";
              } else if (prodClass === 1 || prodClass === 2) {
                mode = "train";
              } else if (prodClass === 5 || prodClass === 7) {
                mode = "bus";
              } else if (prodClass === 9 || prodName.includes("ferry")) {
                mode = "ferry";
              } else if (
                prodClass === 4 ||
                prodName.includes("tram") ||
                prodName.includes("light rail") ||
                prodName.includes("lightrail")
              ) {
                mode = "tram";
              }
            }

            legsData.push({
              mode,
              duration: leg.duration || 0,
              distance: leg.distance || 0,
              coordinates: coords,
            });

            if (mode === "walking") {
              walkingDistance += leg.distance || 0;
            } else {
              transitDistance += leg.distance || 0;
            }

            if (coords.length > 0) {
              features.push({
                type: "Feature",
                properties: { mode },
                geometry: {
                  type: "LineString",
                  coordinates: coords,
                },
              });
            }
          }

          return NextResponse.json({
            distance: totalDistance,
            walkingDistance,
            transitDistance,
            duration,
            legs: legsData,
            geometry: {
              type: "FeatureCollection",
              features,
            },
          });
        }
      }
    } catch (error) {
      console.error(
        "TfNSW API failed, falling back to Targomo Route API:",
        error,
      );
    }
  }

  // Fallback 1: Targomo Transit Routing
  const targomoKey = process.env.TARGOMO_API_KEY;
  if (targomoKey) {
    try {
      const url = `https://api.targomo.com/australia/v1/route?key=${targomoKey}`;
      let transitFrameDate: number | undefined;
      let transitFrameTime: number | undefined;

      if (dateParam) {
        const d = new Date(dateParam);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          transitFrameDate = parseInt(`${year}${month}${day}`, 10);
          transitFrameTime =
            d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        }
      }

      const payload: any = {
        sources: [
          { id: "src", lat: Number(originLat), lng: Number(originLng) },
        ],
        targets: [{ id: "tgt", lat: Number(destLat), lng: Number(destLng) }],
        travelType: "transit",
        pathSerializer: "geojson",
        edgeWeight: "time",
        maxEdgeWeight: 7200, // 2 hours max travel time (API key limit)
        simplify: 0, // request highest resolution geometries to avoid cutting across blocks
      };

      if (transitFrameDate && transitFrameTime !== undefined) {
        payload.sources[0].tm = {
          transit: {
            frame: {
              date: transitFrameDate,
              time: transitFrameTime,
              duration: 3600,
            },
            maxTransfers: 5,
          },
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();

        // Extract features (Targomo API nests them inside data.routes)
        const rawFeatures =
          data.features ||
          data.data?.features ||
          data.routes?.[0]?.features ||
          data.data?.routes?.[0]?.features ||
          [];

        if (rawFeatures && rawFeatures.length > 0) {
          const legsData = [];
          const features = [];
          let totalDistance = 0;
          let walkingDistance = 0;
          let transitDistance = 0;
          let totalDuration = 0;

          for (const f of rawFeatures) {
            if (f.geometry?.type === "LineString") {
              const travelType = f.properties?.travelType?.toLowerCase() || "";

              if (travelType === "car" || travelType === "driving") {
                continue;
              }

              let mode = "transit";

              if (
                travelType === "walk" ||
                travelType === "foot" ||
                travelType === "transfer"
              ) {
                mode = "walking";
              } else {
                // Try to sniff specific GTFS routeTypes or vehicle names
                const routeType = f.properties?.routeType;
                const vehicleType = String(
                  f.properties?.vehicleType ||
                    f.properties?.line ||
                    f.properties?.type ||
                    f.properties?.routeLongName ||
                    f.properties?.routeShortName ||
                    f.properties?.tripHeadSign ||
                    "",
                ).toLowerCase();

                if (routeType !== undefined) {
                  // GTFS standard route types
                  if (routeType === 0) mode = "tram";
                  else if (routeType === 1) mode = "metro";
                  else if (routeType === 2) mode = "train";
                  else if (routeType === 3) mode = "bus";
                  else if (routeType === 4) mode = "ferry";
                } else if (vehicleType) {
                  // String matching as a fallback
                  if (
                    vehicleType.includes("train") ||
                    vehicleType.includes("rail")
                  )
                    mode = "train";
                  else if (vehicleType.includes("bus")) mode = "bus";
                  else if (
                    vehicleType.includes("tram") ||
                    vehicleType.includes("light")
                  )
                    mode = "tram";
                  else if (
                    vehicleType.includes("ferry") ||
                    vehicleType.includes("boat")
                  )
                    mode = "ferry";
                  else if (
                    vehicleType.includes("subway") ||
                    vehicleType.includes("metro")
                  )
                    mode = "metro";
                }
              }

              const durationSec = f.properties?.travelTime || 0;
              const distanceMeters = f.properties?.length || 0;

              totalDistance += distanceMeters;
              totalDuration += durationSec;
              if (mode === "walking") {
                walkingDistance += distanceMeters;
              } else {
                transitDistance += distanceMeters;
              }

              let coords = f.geometry.coordinates;
              if (coords && coords.length > 0 && Array.isArray(coords[0])) {
                // If the first coordinate value is huge, it's EPSG:3857 Web Mercator
                if (Math.abs(coords[0][0]) > 180) {
                  coords = coords.map((c: any) => {
                    const lng = (c[0] / 20037508.34) * 180;
                    let lat = (c[1] / 20037508.34) * 180;
                    lat =
                      (180 / Math.PI) *
                      (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) -
                        Math.PI / 2);
                    return [lng, lat];
                  });
                }
              }

              legsData.push({
                mode,
                duration: durationSec,
                distance: distanceMeters,
                coordinates: coords,
              });

              features.push({
                type: "Feature",
                properties: { mode },
                geometry: {
                  ...f.geometry,
                  coordinates: coords,
                },
              });
            }
          }

          if (features.length > 0) {
            return NextResponse.json({
              distance: totalDistance,
              walkingDistance,
              transitDistance,
              duration: totalDuration,
              legs: legsData,
              geometry: {
                type: "FeatureCollection",
                features,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("Targomo Route API failed:", error);
    }
  }

  // Fallback 2: Mapbox Directions API if TfNSW and Google are not configured or fail
  try {
    const mapboxToken = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error("Missing Mapbox token for transit route fallback");
      return NextResponse.json(
        { message: "Unable to calculate route: missing mapbox token" },
        { status: 500 }
      );
    }
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?access_token=${mapboxToken}&geometries=geojson`;
    
    // Pass along the referer so URL-restricted Mapbox tokens work server-side
    const referer = req.headers.get("referer") || req.nextUrl?.origin || "";
    const headers: Record<string, string> = {};
    if (referer) {
      headers["Referer"] = referer;
    }
    
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      const route = data.routes?.[0];
      if (route) {
        // Mock a single transit leg using driving geometries
        return NextResponse.json({
          distance: route.distance,
          walkingDistance: 0,
          transitDistance: route.distance,
          duration: route.duration * 1.3, // add some transit buffer
          legs: [
            {
              mode: "transit",
              duration: route.duration * 1.3,
              distance: route.distance,
              coordinates: route.geometry.coordinates,
            },
          ],
          geometry: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { mode: "transit" },
                geometry: route.geometry,
              },
            ],
          },
        });
      }
    }
  } catch (err) {
    console.error("Mapbox Directions fallback failed:", err);
  }

  return NextResponse.json(
    { message: "Unable to calculate route" },
    { status: 500 },
  );
});
