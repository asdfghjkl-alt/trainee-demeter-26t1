"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import type { Room, LocationResult } from "@/types/room";
import api from "@/lib/axios";
import axios from "axios";
import {
  Trophy,
  Loader2,
  MapPin,
  Home,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  room: Room;
  currentParticipantId: string;
}

interface RouteDetails {
  distance: number;
  duration: number;
  geometry?: GeoJSON.Geometry | GeoJSON.FeatureCollection;
}

function mapToMapboxProfile(mode?: string): string {
  switch (mode) {
    case "walking":
      return "walking";
    case "cycling":
      return "cycling";
    case "driving":
    case "transit":
    default:
      return "driving";
  }
}

export default function ResultsView({ room, currentParticipantId }: Props) {
  // ─── Results fetch ─────────────────────────────────────────────────────
  const [results, setResults] = useState<LocationResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/rooms/${room.code}/results`, {
          params: { participantId: currentParticipantId },
        });
        setResults(res.data.results);
      } catch (err: unknown) {
        const status = axios.isAxiosError(err)
          ? err.response?.status
          : undefined;
        if (status === 401) {
          setError("You're not authorized to see these results.");
        } else if (status === 400) {
          setError("Voting hasn't finished yet.");
        } else {
          setError("Failed to load results.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [room.code, currentParticipantId]);

  // ─── Derived ───────────────────────────────────────────────────────────
  const currentParticipant = room.participants.find(
    (p) => p._id === currentParticipantId,
  );
  const isTransit = currentParticipant?.transportationMode === "transit";

  const totalVotes = useMemo(
    () => (results ?? []).reduce((sum, r) => sum + r.votes, 0),
    [results],
  );
  const hasAnyVotes = totalVotes > 0;

  const winners = useMemo(() => {
    if (!results || !hasAnyVotes) return [];
    return results.filter((r) => r.rank === 1);
  }, [results, hasAnyVotes]);

  // Stable key for winners so effects don't re-run on identity-only changes
  const winnersKey = winners.map((w) => w._id).join(",");

  const participantLat = currentParticipant?.latitude;
  const participantLng = currentParticipant?.longitude;
  const activeOrigin = useMemo(() => {
    if (participantLat && participantLng) {
      return { latitude: participantLat, longitude: participantLng };
    }
    return null;
  }, [participantLat, participantLng]);

  // ─── Route fetching for winners ────────────────────────────────────────
  const [routeDistances, setRouteDistances] = useState<{
    [id: string]: RouteDetails;
  }>({});

  useEffect(() => {
    if (!activeOrigin || winners.length === 0) {
      setRouteDistances({});
      return;
    }

    const fetchRoutes = async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;

      const profile = mapToMapboxProfile(
        currentParticipant?.transportationMode,
      );
      const next: { [id: string]: RouteDetails } = {};

      const promises = winners.map(async (loc) => {
        try {
          const isFromVenue = room.meetingDirection === "from-venue";
          const startLat = isFromVenue ? loc.latitude : activeOrigin.latitude;
          const startLng = isFromVenue ? loc.longitude : activeOrigin.longitude;
          const endLat = isFromVenue ? activeOrigin.latitude : loc.latitude;
          const endLng = isFromVenue ? activeOrigin.longitude : loc.longitude;

          const url = isTransit
            ? `/api/routes/transit?originLat=${startLat}&originLng=${startLng}&destLat=${endLat}&destLng=${endLng}${room.date ? `&date=${encodeURIComponent(room.date)}` : ""}`
            : `https://api.mapbox.com/directions/v5/mapbox/${profile}/${startLng},${startLat};${endLng},${endLat}?access_token=${token}&geometries=geojson`;

          const headers: HeadersInit = {};
          if (isTransit) {
            try {
              headers["x-timezone"] =
                Intl.DateTimeFormat().resolvedOptions().timeZone;
            } catch (e) {
              // ignore
            }
          }

          const res = await fetch(url, { headers });
          if (!res.ok) return null;
          const data = await res.json();
          if (isTransit) {
            return {
              id: loc._id!,
              details: {
                distance: data.distance,
                duration: data.duration,
                geometry: data.geometry,
              } satisfies RouteDetails,
            };
          } else if (data.routes?.[0]) {
            return {
              id: loc._id!,
              details: {
                distance: data.routes[0].distance,
                duration: data.routes[0].duration,
                geometry: data.routes[0].geometry,
              } satisfies RouteDetails,
            };
          }
        } catch (err) {
          console.error("Error fetching winner route:", err);
        }
        return null;
      });

      const settled = await Promise.all(promises);
      settled.forEach((s) => {
        if (s) next[s.id] = s.details;
      });
      setRouteDistances(next);
    };

    fetchRoutes();
  }, [
    activeOrigin,
    winnersKey,
    currentParticipant?.transportationMode,
    room.date,
    room.meetingDirection,
    isTransit,
  ]);

  // ─── Map ───────────────────────────────────────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const otherParticipantsMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const activePopupRef = useRef<mapboxgl.Popup | null>(null);
  const [selectedMapLocationId, setSelectedMapLocationId] = useState<
    string | null
  >(null);

  // Init map once results are loaded so the container is mounted
  useEffect(() => {
    if (!mapContainerRef.current || !results) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not found");
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [151.2093, -33.8688],
      zoom: 12,
    });

    map.on("load", () => {
      map.resize();
      setMapInstance(map);
    });

    return () => {
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      otherParticipantsMarkersRef.current.forEach((m) => m.remove());
      otherParticipantsMarkersRef.current = [];
      map.remove();
      setMapInstance(null);
    };
  }, [results]);

  const showLocationDetails = useCallback(
    (location: LocationResult) => {
      setSelectedMapLocationId(location._id || null);
      if (
        !mapInstance ||
        !mapInstance.getCanvasContainer ||
        !mapInstance.getCanvasContainer()
      )
        return;

      mapInstance.easeTo({
        center: [location.longitude, location.latitude],
        duration: 400,
      });

      if (activePopupRef.current) {
        activePopupRef.current.remove();
      }

      const route = routeDistances[location._id!];
      const popupHtml = `
        <div class="p-2 text-xs text-gray-900 dark:text-white bg-white dark:bg-[#111] rounded-lg">
          <p class="font-bold mb-0.5">${escapeHtml(location.name)}</p>
          ${location.description ? `<p class="text-gray-500 dark:text-gray-400 font-medium truncate max-w-[150px] mb-1">${escapeHtml(location.description)}</p>` : ""}
          ${
            activeOrigin
              ? route
                ? `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
              <span>${(route.distance / 1000).toFixed(1)} km</span>
              <span class="text-gray-300 dark:text-gray-700">•</span>
              <span>${Math.round(route.duration / 60)} mins</span>
            </div>
          `
                : `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 flex items-center gap-1.5">
              <span>Calculating route...</span>
            </div>
          `
              : ""
          }
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
        .setLngLat([location.longitude, location.latitude])
        .setHTML(popupHtml)
        .addTo(mapInstance);

      activePopupRef.current = popup;
    },
    [mapInstance, routeDistances, activeOrigin, isTransit],
  );

  // Keep a ref so the marker click handler always sees the latest version
  const showLocationDetailsRef = useRef(showLocationDetails);
  useEffect(() => {
    showLocationDetailsRef.current = showLocationDetails;
  }, [showLocationDetails]);

  // Render winner markers (and user origin), fit bounds, and auto-select the
  // single-winner case so the route is visible without clicking.
  useEffect(() => {
    if (
      !mapInstance ||
      !mapInstance.getCanvasContainer ||
      !mapInstance.getCanvasContainer()
    )
      return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    otherParticipantsMarkersRef.current.forEach((m) => m.remove());
    otherParticipantsMarkersRef.current = [];

    const coordsCount: Record<string, number> = {};
    winners.forEach((loc) => {
      const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
      coordsCount[key] = (coordsCount[key] || 0) + 1;
    });

    const coordsSeen: Record<string, number> = {};

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    winners.forEach((loc) => {
      const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
      const totalAtCoord = coordsCount[key];
      const seenCount = coordsSeen[key] || 0;
      coordsSeen[key] = seenCount + 1;

      let offset: [number, number] = [0, 0];
      if (totalAtCoord > 1) {
        // Shift vertically by 30px per overlapping marker
        offset = [0, (seenCount - (totalAtCoord - 1) / 2) * 30];
      }

      const el = document.createElement("div");
      // Add default z-index
      el.style.zIndex = "1";
      const inner = document.createElement("div");
      inner.className =
        "marker-inner flex items-center gap-1.5 bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded-full border border-white dark:border-gray-900 shadow-md cursor-pointer hover:bg-amber-400 transition-all duration-150 whitespace-nowrap pointer-events-auto";
      inner.innerHTML = `
        <span class="w-4 h-4 flex items-center justify-center text-[11px]">🏆</span>
        <span class="max-w-[120px] truncate">${escapeHtml(loc.name)}</span>
      `;
      el.appendChild(inner);

      const marker = new mapboxgl.Marker({ element: el, offset })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(mapInstance);

      const handle = (e: Event) => {
        e.stopPropagation();
        showLocationDetailsRef.current(loc);
      };
      inner.addEventListener("click", handle);
      inner.addEventListener("touchstart", handle);

      markersRef.current[loc._id!] = marker;
      bounds.extend([loc.longitude, loc.latitude]);
      hasCoords = true;
    });

    // Participant markers (pulsing dots — amber for admin, cyan for others)
    room.participants.forEach((p) => {
      const isCurrentUser = p._id === currentParticipant?._id;
      const lat =
        isCurrentUser && activeOrigin ? activeOrigin.latitude : p.latitude;
      const lng =
        isCurrentUser && activeOrigin ? activeOrigin.longitude : p.longitude;

      if (lat != null && lng != null) {
        const el = document.createElement("div");
        el.className =
          "relative flex items-center justify-center w-6 h-6 z-[50]";
        if (isCurrentUser) el.style.zIndex = "60";

        el.innerHTML = `
          <span class="absolute inline-flex h-full w-full rounded-full ${p.isAdmin ? "bg-amber-400" : "bg-cyan-400"} opacity-75 animate-ping"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 ${p.isAdmin ? "bg-amber-500" : "bg-cyan-600"} border border-white shadow-md"></span>
        `;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapInstance);

        const isFromVenue = room.meetingDirection === "from-venue";
        let labelText = `${escapeHtml(p.name)}${p.isAdmin ? " (Admin)" : ""}<br/><span class="font-normal text-gray-500">${escapeHtml(p.location || "Unknown Suburb")}</span>`;

        if (isCurrentUser) {
          const originLabel = isFromVenue
            ? `Your Return Suburb: ${p.location || "Destination"}`
            : `Your Suburb: ${p.location || "Starting Point"}`;
          labelText = escapeHtml(originLabel);
          userMarkerRef.current = marker;
          bounds.extend([lng, lat]);
          hasCoords = true;
        } else {
          otherParticipantsMarkersRef.current.push(marker);
        }

        const popup = new mapboxgl.Popup({
          offset: 10,
          closeButton: false,
        }).setHTML(
          `<div class="p-1.5 text-[10px] font-bold text-gray-700 dark:text-gray-300">${labelText}</div>`,
        );

        marker.setPopup(popup);
      }
    });

    if (hasCoords) {
      mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 0 });
    }

    // Auto-open the single winner so the route is shown without requiring a click
    if (winners.length === 1) {
      setSelectedMapLocationId(winners[0]._id || null);
    }
  }, [
    mapInstance,
    winnersKey,
    activeOrigin,
    currentParticipant?.location,
    room.meetingDirection,
    room.participants,
    currentParticipant,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync popup and route geometry when the selected winner or route data changes
  useEffect(() => {
    if (!mapInstance || !selectedMapLocationId) return;
    const location = winners.find((w) => w._id === selectedMapLocationId);
    if (!location) return;

    // Bring selected marker to front
    Object.entries(markersRef.current).forEach(([id, m]) => {
      m.getElement().style.zIndex = id === selectedMapLocationId ? "10" : "1";
    });

    const route = routeDistances[selectedMapLocationId];

    if (activePopupRef.current && activePopupRef.current.isOpen()) {
      const popupHtml = `
        <div class="p-2 text-xs text-gray-900 dark:text-white bg-white dark:bg-[#111] rounded-lg">
          <p class="font-bold mb-0.5">${escapeHtml(location.name)}</p>
          ${location.description ? `<p class="text-gray-500 dark:text-gray-400 font-medium truncate max-w-[150px] mb-1">${escapeHtml(location.description)}</p>` : ""}
          ${
            activeOrigin
              ? route
                ? `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
              <span>${(route.distance / 1000).toFixed(1)} km</span>
              <span class="text-gray-300 dark:text-gray-700">•</span>
              <span>${Math.round(route.duration / 60)} mins</span>
            </div>
          `
                : `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 flex items-center gap-1.5">
              <span>Calculating route...</span>
            </div>
          `
              : ""
          }
        </div>
      `;
      activePopupRef.current.setHTML(popupHtml);
    } else if (winners.length === 1) {
      // Single-winner auto-open path: open the popup now that the map is ready
      showLocationDetailsRef.current(location);
    }

    if (route?.geometry) {
      const geojson =
        (route.geometry as GeoJSON.FeatureCollection).type ===
        "FeatureCollection"
          ? (route.geometry as GeoJSON.FeatureCollection)
          : ({
              type: "Feature" as const,
              properties: {},
              geometry: route.geometry as GeoJSON.Geometry,
            } as GeoJSON.Feature);

      if (mapInstance.getSource("route")) {
        (mapInstance.getSource("route") as mapboxgl.GeoJSONSource).setData(
          geojson as GeoJSON.FeatureCollection | GeoJSON.Feature,
        );
      } else {
        mapInstance.addSource("route", {
          type: "geojson",
          data: geojson as GeoJSON.FeatureCollection | GeoJSON.Feature,
        });
        mapInstance.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": [
              "match",
              ["coalesce", ["get", "mode"], "transit"],
              "walking",
              "#3b82f6",
              "train",
              "#f97316",
              "bus",
              "#eab308",
              "metro",
              "#a855f7",
              "ferry",
              "#06b6d4",
              "tram",
              "#ef4444",
              "#10b981",
            ] as unknown as mapboxgl.ExpressionSpecification,
            "line-width": [
              "match",
              ["coalesce", ["get", "mode"], "transit"],
              "walking",
              3,
              "train",
              6,
              "bus",
              5,
              "metro",
              6,
              "ferry",
              5,
              "tram",
              5,
              5,
            ] as unknown as mapboxgl.ExpressionSpecification,
            "line-opacity": 0.85,
          },
        });
      }
    } else if (mapInstance.getSource("route")) {
      (mapInstance.getSource("route") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  }, [
    mapInstance,
    selectedMapLocationId,
    routeDistances,
    winners,
    activeOrigin,
    isTransit,
  ]);

  // ─── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-500">{error ?? "Failed to load results."}</p>
        <Link
          href="/"
          className="text-sm font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Header room={room} />

          {room.algorithmNotices && room.algorithmNotices.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Algorithm Notice
              </div>
              {room.algorithmNotices.map((notice, i) => (
                <p
                  key={i}
                  className="text-xs text-amber-600 dark:text-amber-300 pl-6 leading-relaxed"
                >
                  {notice}
                </p>
              ))}
            </div>
          )}

          {hasAnyVotes ? (
            <Podium winners={winners} onViewMap={showLocationDetails} />
          ) : (
            <NoVotesCard />
          )}

          <Breakdown results={results} hasAnyVotes={hasAnyVotes} />

          <Link
            href="/"
            className="btn flex items-center justify-center gap-2 w-full font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Home className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Location Map
              </span>
              <span className="text-xs text-gray-450 dark:text-gray-450">
                {hasAnyVotes
                  ? winners.length > 1
                    ? "Click a pin to see that route"
                    : "Winning route highlighted"
                  : "No votes were cast"}
              </span>
            </div>
            <div className="relative h-[400px] lg:h-[600px] w-full bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
              <div
                ref={mapContainerRef}
                className="absolute inset-0 w-full h-full"
              />

              {isTransit && hasAnyVotes && (
                <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-[#111]/90 backdrop-blur-md p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-md z-10 text-[10px] space-y-2 pointer-events-none select-none max-w-[150px]">
                  <p className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-1 mb-1">
                    Transit Legend
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-1 rounded bg-[#a855f7]" />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        Metro
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-1 rounded bg-[#f97316]" />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        Train
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-1 rounded bg-[#eab308]" />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        Bus
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-1 rounded bg-[#06b6d4]" />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        Ferry
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-1 rounded bg-[#ef4444]" />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        Light Rail
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-1 rounded bg-[#3b82f6]" />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        Walking
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function Header({ room }: { room: Room }) {
  const formattedDate = useMemo(() => {
    if (!room.date) return null;
    try {
      const d = new Date(room.date);
      if (isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    } catch {
      return null;
    }
  }, [room.date]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-850 pb-4">
      <div className="space-y-1">
        <h1 className="text-gray-900 dark:text-white">{room.name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {formattedDate && (
            <span className="font-semibold text-cyan-600 dark:text-cyan-400">
              Scheduled for: {formattedDate}
            </span>
          )}
          {formattedDate && (
            <span className="hidden sm:inline text-gray-300 dark:text-gray-750">
              |
            </span>
          )}
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {room.meetingDirection === "from-venue"
              ? "Direction: Travel Home from Venue"
              : "Direction: Commute to Venue"}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 pt-1">
          The results are in — see what your group picked.
        </p>
      </div>
    </div>
  );
}

function Podium({
  winners,
  onViewMap,
}: {
  winners: LocationResult[];
  onViewMap: (loc: LocationResult) => void;
}) {
  if (winners.length === 1) {
    const w = winners[0];
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-linear-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 p-6 text-center space-y-3 shadow-sm">
        <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Winner
        </p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {w.name}
        </h2>
        {w.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {w.description}
          </p>
        )}
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          {w.votes} {w.votes === 1 ? "vote" : "votes"}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onViewMap(w)}
            className="btn inline-flex items-center justify-center gap-2 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:opacity-100"
          >
            <MapPin className="w-4 h-4" />
            View on Map
          </button>
          <a
            href={mapsUrl(w)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white border-amber-600 hover:opacity-100"
          >
            Open in Google Maps
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          It&apos;s a tie!
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {winners.length} locations tied for first place.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {winners.map((w) => (
          <div
            key={w._id}
            className="flex-1 min-w-[220px] rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-2 shadow-xs"
          >
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {w.name}
            </h3>
            {w.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {w.description}
              </p>
            )}
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {w.votes} {w.votes === 1 ? "vote" : "votes"}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => onViewMap(w)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MapPin className="w-3 h-3" />
                Focus Map
              </button>
              <a
                href={mapsUrl(w)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Open in Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoVotesCard() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-6 text-center space-y-2">
      <p className="font-semibold text-gray-700 dark:text-gray-300">
        No votes were cast
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Voting closed before anyone submitted a first preference.
      </p>
    </div>
  );
}

function Breakdown({
  results,
  hasAnyVotes,
}: {
  results: LocationResult[];
  hasAnyVotes: boolean;
}) {
  const maxVotes = Math.max(...results.map((r) => r.votes), 0);

  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Full breakdown
      </h3>
      <div className="space-y-2">
        {results.map((r) => {
          const isWinner = hasAnyVotes && r.rank === 1;
          const pct = maxVotes > 0 ? (r.votes / maxVotes) * 100 : 0;
          return (
            <div
              key={r._id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                isWinner
                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                  : "bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-800"
              }`}
            >
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs shrink-0 ${
                  isWinner
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {r.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {r.name}
                </p>
                {hasAnyVotes ? (
                  <div className="h-1.5 mt-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isWinner ? "bg-amber-500" : "bg-cyan-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">
                    No first-preference votes
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-bold ${
                    isWinner
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {r.votes}
                </p>
                <p className="text-[10px] uppercase text-gray-400">
                  {r.votes === 1 ? "vote" : "votes"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mapsUrl(loc: LocationResult): string {
  return `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
