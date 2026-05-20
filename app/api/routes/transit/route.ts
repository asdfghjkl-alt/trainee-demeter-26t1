import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";

function formatSydneyDateTime(date: Date) {
  const optionsDate = { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" } as const;
  const optionsTime = { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hour12: false } as const;

  const dtfDate = new Intl.DateTimeFormat("en-AU", optionsDate);
  const dtfTime = new Intl.DateTimeFormat("en-AU", optionsTime);

  const dateParts = dtfDate.formatToParts(date);
  const timeParts = dtfTime.formatToParts(date);

  const day = dateParts.find(p => p.type === "day")?.value || "";
  const month = dateParts.find(p => p.type === "month")?.value || "";
  const year = dateParts.find(p => p.type === "year")?.value || "";

  const hour = timeParts.find(p => p.type === "hour")?.value || "";
  const minute = timeParts.find(p => p.type === "minute")?.value || "";

  return {
    itdDate: `${year}${month}${day}`, // e.g. "20260522"
    itdTime: `${hour}${minute}`       // e.g. "1330"
  };
}

export const GET = apiHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const originLat = searchParams.get("originLat");
  const originLng = searchParams.get("originLng");
  const destLat = searchParams.get("destLat");
  const destLng = searchParams.get("destLng");
  const dateParam = searchParams.get("date");

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json(
      { message: "Missing required coordinates parameters" },
      { status: 400 }
    );
  }

  const apiKey = process.env.TFNSW_API_KEY;
  const isKeyConfigured = apiKey && apiKey !== "your_tfnsw_api_key_here";

  if (isKeyConfigured) {
    try {
      const url = new URL("https://api.transport.nsw.gov.au/v1/tp/trip");
      url.searchParams.set("outputFormat", "rapidJSON");
      url.searchParams.set("coordOutputFormat", "EPSG:4326");
      url.searchParams.set("type_origin", "coord");
      url.searchParams.set("name_origin", `${originLng}:${originLat}:EPSG:4326`);
      url.searchParams.set("type_destination", "coord");
      url.searchParams.set("name_destination", `${destLng}:${destLat}:EPSG:4326`);
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

          // Compare departure and arrival times to get estimated duration
          const depTimeStr = journey.legs[0].origin?.departureTimeEstimated || journey.legs[0].origin?.departureTimePlanned;
          const arrTimeStr = journey.legs[journey.legs.length - 1].destination?.arrivalTimeEstimated || journey.legs[journey.legs.length - 1].destination?.arrivalTimePlanned;

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
              const prodName = String(leg.transportation.product?.name || "").toLowerCase();
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
              if (prodName.includes("footpath") || prodClass === 99 || prodClass === 100) {
                mode = "walking";
              } else if (prodName.includes("metro")) {
                mode = "metro";
              } else if (prodClass === 1 || prodClass === 2) {
                mode = "train";
              } else if (prodClass === 5 || prodClass === 7) {
                mode = "bus";
              } else if (prodClass === 9 || prodName.includes("ferry")) {
                mode = "ferry";
              } else if (prodClass === 4 || prodName.includes("tram") || prodName.includes("light rail") || prodName.includes("lightrail")) {
                mode = "tram";
              }
            }

            legsData.push({
              mode,
              duration: leg.duration || 0,
              distance: leg.distance || 0,
              coordinates: coords,
            });

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
      console.error("TfNSW API failed, falling back to Mapbox Directions:", error);
    }
  }

  // Fallback to Mapbox Directions API if TfNSW not configured or fails
  try {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?access_token=${mapboxToken}&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const route = data.routes?.[0];
      if (route) {
        // Mock a single transit leg using driving geometries
        return NextResponse.json({
          distance: route.distance,
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
    { status: 500 }
  );
});
