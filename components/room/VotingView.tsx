"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type {
  Room,
  Location,
  VotePayload,
  Participant,
  TransportationMode,
} from "@/types/room";
import LocationCard from "./LocationCard";
import {
  Send,
  X,
  Trophy,
  Loader2,
  Car,
  Train,
  PersonStanding,
  Bike,
  Bus,
  MapPin,
  RefreshCw,
  AlertTriangle,
  ArrowDownUp,
} from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const transportIcons: Record<TransportationMode, React.ReactNode> = {
  transit: <Train className="w-3.5 h-3.5" />,
  driving: <Car className="w-3.5 h-3.5" />,
  cycling: <Bike className="w-3.5 h-3.5" />,
  walking: <PersonStanding className="w-3.5 h-3.5" />,
};

const transportLabels: Record<TransportationMode, string> = {
  transit: "Transit",
  driving: "Driving",
  cycling: "Cycling",
  walking: "Walking",
};

interface Props {
  room: Room;
  currentParticipantId: string;
  onVotingClosed?: () => void;
  onVoteSubmitted?: () => void;
}

export default function VotingView({
  room,
  currentParticipantId,
  onVotingClosed,
  onVoteSubmitted,
}: Props) {
  // ─── State ───────────────────────────────────────────────────────────

  const [rankedLocations, setRankedLocations] = useState<Location[]>(
    room.locations,
  );

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const checkHasVoted = async () => {
      try {
        const res = await api.get(`/rooms/${room.code}/votes`, {
          params: { participantId: currentParticipantId },
        });
        if (res.data?.hasVoted) {
          setHasVoted(true);
          onVoteSubmitted?.();
        }
      } catch (err) {
        console.error("Error checking voting status:", err);
      }
    };
    if (room.code && currentParticipantId) {
      checkHasVoted();
    }
  }, [room.code, currentParticipantId, onVoteSubmitted]);

  useEffect(() => {
    setRankedLocations(room.locations);
  }, [room.locations]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosingVote, setIsClosingVote] = useState(false);

  const [gpsCoords, setGpsCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [useLiveGPS, setUseLiveGPS] = useState(false);

  const currentParticipant = room.participants.find(
    (p) => p._id === currentParticipantId,
  );

  // Active origin coordinates (use live GPS if toggled & active, otherwise fall back to geocoded joined suburb)
  const activeOrigin = useMemo(() => {
    return useLiveGPS && gpsCoords
      ? gpsCoords
      : currentParticipant?.latitude && currentParticipant?.longitude
        ? {
            latitude: currentParticipant.latitude,
            longitude: currentParticipant.longitude,
          }
        : gpsCoords; // fallback to GPS if no suburb coordinates
  }, [
    useLiveGPS,
    gpsCoords,
    currentParticipant?.latitude,
    currentParticipant?.longitude,
  ]);

  // Serialized locations key to prevent duplicate route queries when unrelated room updates happen
  const locationsKey = room.locations
    .map((l) => `${l._id}-${l.latitude}-${l.longitude}`)
    .join(",");

  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const prevOriginRef = useRef<string | null>(null);
  const prevLocationsCountRef = useRef<number>(0);

  interface RouteDetails {
    distance: number;
    walkingDistance?: number;
    transitDistance?: number;
    duration: number;
    geometry?: any;
    isFallbackToDriving?: boolean;
  }
  const [routeDistances, setRouteDistances] = useState<{
    [locationId: string]: RouteDetails;
  }>({});

  const mapToMapboxProfile = (mode?: string): string => {
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
  };

  // Request GPS permission and toggle it active
  const requestGPS = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setGpsCoords(coords);
          setUseLiveGPS(true);
          toast.success("Connected to live GPS!");
        },
        (error) => {
          console.warn("Geolocation permission denied or error:", error);
          toast.error(
            "Could not access GPS. Please check browser permissions.",
          );
        },
        { enableHighAccuracy: true },
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  // Fetch travel routes and distances from Mapbox/TfNSW APIs using activeOrigin (in parallel)
  useEffect(() => {
    if (!activeOrigin || room.locations.length === 0) {
      setRouteDistances({});
      return;
    }

    const fetchRoutes = async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;

      const profile = mapToMapboxProfile(
        currentParticipant?.transportationMode,
      );
      const newDistances: { [id: string]: RouteDetails } = {};

      const promises = room.locations.map(async (loc) => {
        try {
          const isTransit =
            currentParticipant?.transportationMode === "transit";
          const isFromVenue = room.meetingDirection === "from-venue";
          const startLat = isFromVenue ? loc.latitude : activeOrigin.latitude;
          const startLng = isFromVenue ? loc.longitude : activeOrigin.longitude;
          const endLat = isFromVenue ? activeOrigin.latitude : loc.latitude;
          const endLng = isFromVenue ? activeOrigin.longitude : loc.longitude;

          const url = isTransit
            ? `/api/routes/transit?originLat=${startLat}&originLng=${startLng}&destLat=${endLat}&destLng=${endLng}${room.date ? `&date=${encodeURIComponent(room.date)}` : ""}`
            : `https://api.mapbox.com/directions/v5/mapbox/${profile}/${startLng},${startLat};${endLng},${endLat}?access_token=${token}&geometries=geojson`;

          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (isTransit) {
              return {
                id: loc._id!,
                details: {
                  distance: data.distance,
                  walkingDistance: data.walkingDistance,
                  transitDistance: data.transitDistance,
                  duration: data.duration,
                  geometry: data.geometry,
                  isFallbackToDriving: data.isFallbackToDriving,
                },
              };
            } else if (data.routes?.[0]) {
              return {
                id: loc._id!,
                details: {
                  distance: data.routes[0].distance,
                  duration: data.routes[0].duration,
                  geometry: data.routes[0].geometry,
                },
              };
            }
          }
        } catch (err) {
          console.error("Error fetching route:", err);
        }
        return null;
      });

      const results = await Promise.all(promises);
      results.forEach((res) => {
        if (res) {
          newDistances[res.id] = res.details;
        }
      });

      setRouteDistances(newDistances);
    };

    fetchRoutes();
  }, [
    activeOrigin,
    locationsKey,
    currentParticipant?.transportationMode,
    room.date,
    room.meetingDirection,
  ]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const otherParticipantsMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedMapLocationId, setSelectedMapLocationId] = useState<
    string | null
  >(null);
  const activePopupRef = useRef<mapboxgl.Popup | null>(null);

  // Initialize persistent Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not found");
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [151.2093, -33.8688], // default Sydney
      zoom: 12,
    });

    map.on("load", () => {
      map.resize();
      setMapInstance(map);
    });

    return () => {
      if (activePopupRef.current) {
        activePopupRef.current.remove();
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
  }, []);

  // Fit map bounds to include all locations and user starting location (runs once on load or when structurally changed)
  useEffect(() => {
    if (
      !mapInstance ||
      !mapInstance.getCanvasContainer ||
      !mapInstance.getCanvasContainer()
    )
      return;

    const originKey = activeOrigin
      ? `${activeOrigin.latitude},${activeOrigin.longitude}`
      : null;
    const locationsCount = room.locations.length;

    // Only run fitBounds if the map is freshly loaded, or if the origin or locations count actually changed
    const hasChanged =
      originKey !== prevOriginRef.current ||
      locationsCount !== prevLocationsCountRef.current;
    if (!hasChanged) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    room.locations.forEach((loc) => {
      bounds.extend([loc.longitude, loc.latitude]);
      hasCoords = true;
    });

    if (activeOrigin) {
      bounds.extend([activeOrigin.longitude, activeOrigin.latitude]);
      hasCoords = true;
    }

    if (hasCoords) {
      mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 0 });
      prevOriginRef.current = originKey;
      prevLocationsCountRef.current = locationsCount;
    }
  }, [mapInstance, room.locations, activeOrigin]);

  // Show details of a location on the map using a popup, travel distance/duration details, and focus center
  const showLocationDetails = (location: Location) => {
    console.log(
      "showLocationDetails called for:",
      location.name,
      "mapInstance is present:",
      !!mapInstance,
    );
    setSelectedMapLocationId(location._id || null);

    if (
      mapInstance &&
      mapInstance.getCanvasContainer &&
      mapInstance.getCanvasContainer()
    ) {
      console.log("Executing easeTo for:", location.name);
      mapInstance.easeTo({
        center: [location.longitude, location.latitude],
        duration: 400,
      });

      if (activePopupRef.current) {
        activePopupRef.current.remove();
      }

      // Find route details
      const route = routeDistances[location._id!];

      const isTransit = currentParticipant?.transportationMode === "transit";
      const popupHtml = `
        <div class="p-2 text-xs text-gray-900 dark:text-white">
          <p class="font-bold mb-0.5">${location.name}</p>
          ${location.description ? `<p class="text-gray-500 dark:text-gray-400 font-medium truncate max-w-[150px] mb-1">${location.description}</p>` : ""}
          ${route && route.isFallbackToDriving ? `<div class="mt-1.5 p-1.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-semibold border border-amber-200 dark:border-amber-800">No public transport detected. <span style="color: #ec4899;">Pink line indicates driving</span>.</div>` : ""}
          ${
            route
              ? `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
              <span>${Math.round(route.duration / 60)} mins</span>
              <span class="text-gray-300 dark:text-gray-700">•</span>
              <span>${isTransit && route.walkingDistance !== undefined && route.walkingDistance > 0 ? (route.walkingDistance / 1000).toFixed(1) + " km walking" : (route.distance / 1000).toFixed(1) + " km"}</span>
            </div>
          `
              : `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 flex items-center gap-1.5">
              <span>Calculating route...</span>
            </div>
          `
          }
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
        .setLngLat([location.longitude, location.latitude])
        .setHTML(popupHtml)
        .addTo(mapInstance);

      activePopupRef.current = popup;
    }
  };

  // Sync map route and popup details when routeDistances changes for the selected location
  useEffect(() => {
    if (!mapInstance || !selectedMapLocationId) return;
    const location = room.locations.find(
      (l) => l._id === selectedMapLocationId,
    );
    if (!location) return;

    // Bring selected marker to front
    Object.entries(markersRef.current).forEach(([id, m]) => {
      m.getElement().style.zIndex = id === selectedMapLocationId ? "10" : "1";
    });

    const route = routeDistances[selectedMapLocationId];

    // Update active popup content dynamically if it is open
    if (activePopupRef.current && activePopupRef.current.isOpen()) {
      const popupHtml = `
        <div class="p-2 text-xs text-gray-900 dark:text-white">
          <p class="font-bold mb-0.5">${location.name}</p>
          ${location.description ? `<p class="text-gray-500 dark:text-gray-400 font-medium truncate max-w-[150px] mb-1">${location.description}</p>` : ""}
          ${route && route.isFallbackToDriving ? `<div class="mt-1.5 p-1.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-semibold border border-amber-200 dark:border-amber-800">No public transport detected. <span style="color: #ec4899;">Pink line indicates driving</span>.</div>` : ""}
          ${
            route
              ? `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
              <span>${Math.round(route.duration / 60)} mins</span>
              <span class="text-gray-300 dark:text-gray-700">•</span>
              <span>${currentParticipant?.transportationMode === "transit" && route.walkingDistance !== undefined && route.walkingDistance > 0 ? (route.walkingDistance / 1000).toFixed(1) + " km walking" : (route.distance / 1000).toFixed(1) + " km"}</span>
            </div>
          `
              : `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 flex items-center gap-1.5">
              <span>Calculating route...</span>
            </div>
          `
          }
        </div>
      `;
      activePopupRef.current.setHTML(popupHtml);
    }

    // Update route geometry on map
    if (route?.geometry) {
      const geojson =
        route.geometry.type === "FeatureCollection"
          ? route.geometry
          : {
              type: "Feature" as const,
              properties: {},
              geometry: route.geometry,
            };

      if (mapInstance.getSource("route")) {
        (mapInstance.getSource("route") as mapboxgl.GeoJSONSource).setData(
          geojson,
        );
      } else {
        mapInstance.addSource("route", {
          type: "geojson",
          data: geojson,
        });

        mapInstance.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": [
              "match",
              ["coalesce", ["get", "mode"], "transit"],
              "walking",
              "#3b82f6", // blue
              "train",
              "#f97316", // orange
              "bus",
              "#eab308", // yellow
              "metro",
              "#a855f7", // purple
              "ferry",
              "#06b6d4", // cyan
              "tram",
              "#ef4444", // red
              "#ec4899", // default generic transit fallback (pink)
            ] as any,
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
            ] as any,
            "line-opacity": 0.85,
          },
        });
      }
    } else {
      // Clear route path
      if (mapInstance.getSource("route")) {
        (mapInstance.getSource("route") as mapboxgl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  }, [mapInstance, selectedMapLocationId, routeDistances, room.locations]);

  const showLocationDetailsRef = useRef(showLocationDetails);
  showLocationDetailsRef.current = showLocationDetails;

  // Sync labeled markers with rankedLocations ordering & activeOrigin (DOM nodes only created/destroyed when list changes)
  useEffect(() => {
    if (
      !mapInstance ||
      !mapInstance.getCanvasContainer ||
      !mapInstance.getCanvasContainer()
    )
      return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    otherParticipantsMarkersRef.current.forEach((m) => m.remove());
    otherParticipantsMarkersRef.current = [];

    const coordsCount: Record<string, number> = {};
    rankedLocations.forEach((loc) => {
      const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
      coordsCount[key] = (coordsCount[key] || 0) + 1;
    });

    const coordsSeen: Record<string, number> = {};

    // Render new markers
    rankedLocations.forEach((location, idx) => {
      const rank = idx + 1;

      const key = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
      const totalAtCoord = coordsCount[key];
      const seenCount = coordsSeen[key] || 0;
      coordsSeen[key] = seenCount + 1;

      let offset: [number, number] = [0, 0];
      if (totalAtCoord > 1) {
        offset = [0, (seenCount - (totalAtCoord - 1) / 2) * 30];
      }

      const el = document.createElement("div");
      el.style.zIndex = "1";

      const isAutoGenerated = !location.addedByAdmin;
      const baseBgColor = isAutoGenerated ? "bg-violet-600" : "bg-cyan-600";
      const hoverBgColor = isAutoGenerated
        ? "hover:bg-violet-500"
        : "hover:bg-cyan-500";
      const rankTextColor = isAutoGenerated
        ? "text-violet-600"
        : "text-cyan-600";

      // Custom inner wrapper to keep Mapbox's classes intact on the outer container
      const inner = document.createElement("div");
      inner.className = `marker-inner flex items-center gap-1.5 ${baseBgColor} text-white font-semibold text-xs px-2.5 py-1 rounded-full border border-white dark:border-gray-900 shadow-md cursor-pointer ${hoverBgColor} transition-all duration-150 whitespace-nowrap pointer-events-auto`;
      inner.setAttribute("data-rank", rank.toString());
      inner.setAttribute("data-autogenerated", isAutoGenerated.toString());

      inner.innerHTML = `
        <span class="w-4 h-4 flex items-center justify-center rounded-full bg-white ${rankTextColor} text-[10px] font-extrabold shrink-0 rank-span">${rank}</span>
        <span class="max-w-[120px] truncate">${location.name}</span>
      `;
      el.appendChild(inner);

      const marker = new mapboxgl.Marker({ element: el, offset })
        .setLngLat([location.longitude, location.latitude])
        .addTo(mapInstance);

      const handleInteraction = (e: Event) => {
        console.log(
          `Marker interaction [${e.type}] triggered for:`,
          location.name,
        );
        e.stopPropagation();
        showLocationDetailsRef.current(location);
      };

      inner.addEventListener("click", handleInteraction);
      inner.addEventListener("mousedown", handleInteraction);
      inner.addEventListener("touchstart", handleInteraction);

      markersRef.current[location._id!] = marker;
    });

    // Render user/origin marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    // Participant markers (pulsing dots — amber for admin, cyan for others)
    room.participants.forEach((p) => {
      // Use activeOrigin for the current user to support live GPS toggling, otherwise use geocoded coords
      const isCurrentUser = p._id === currentParticipant?._id;
      const lat =
        isCurrentUser && activeOrigin ? activeOrigin.latitude : p.latitude;
      const lng =
        isCurrentUser && activeOrigin ? activeOrigin.longitude : p.longitude;

      if (lat != null && lng != null) {
        const el = document.createElement("div");
        el.className =
          "relative flex items-center justify-center w-6 h-6 z-[50]";
        // Make the current user's dot stand out slightly more by lifting it to z-[60]
        if (isCurrentUser) el.style.zIndex = "60";

        el.innerHTML = `
          <span class="absolute inline-flex h-full w-full rounded-full ${p.isAdmin ? "bg-amber-400" : "bg-cyan-400"} opacity-75 animate-ping"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 ${p.isAdmin ? "bg-amber-500" : "bg-cyan-600"} border border-white shadow-md"></span>
        `;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapInstance);

        const isFromVenue = room.meetingDirection === "from-venue";
        let labelText = `${p.name}${p.isAdmin ? " (Admin)" : ""}<br/><span class="font-normal text-gray-500">${p.location || "Unknown Suburb"}</span>`;

        if (isCurrentUser) {
          const originLabel = useLiveGPS
            ? isFromVenue
              ? "Your Return GPS Location"
              : "Your GPS Location"
            : isFromVenue
              ? `Your Return Suburb: ${p.location || "Destination"}`
              : `Your Suburb: ${p.location || "Starting Point"}`;
          labelText = originLabel;
          userMarkerRef.current = marker;
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
  }, [
    mapInstance,
    rankedLocations,
    activeOrigin,
    room.meetingDirection,
    room.participants,
    currentParticipant,
  ]);

  // Update marker selection classes in place without destroying/recreating DOM elements
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const el = marker.getElement();
      const inner = el.querySelector(".marker-inner") as HTMLDivElement | null;
      if (!inner) return;

      const isSelected = id === selectedMapLocationId;
      const rank = inner.getAttribute("data-rank") || "1";
      const isAutoGenerated =
        inner.getAttribute("data-autogenerated") === "true";

      const baseBgColor = isAutoGenerated ? "bg-violet-600" : "bg-cyan-600";
      const hoverBgColor = isAutoGenerated
        ? "hover:bg-violet-500"
        : "hover:bg-cyan-500";
      const rankTextColor = isAutoGenerated
        ? "text-violet-600"
        : "text-cyan-600";

      inner.className = isSelected
        ? "marker-inner flex items-center gap-1.5 bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded-full border-2 border-white dark:border-gray-900 shadow-2xl scale-110 z-50 ring-4 ring-amber-300 dark:ring-amber-900/50 transition-all duration-150 whitespace-nowrap cursor-pointer pointer-events-auto"
        : `marker-inner flex items-center gap-1.5 ${baseBgColor} text-white font-semibold text-xs px-2.5 py-1 rounded-full border border-white dark:border-gray-900 shadow-md cursor-pointer ${hoverBgColor} transition-all duration-150 whitespace-nowrap pointer-events-auto`;

      const rankSpan = inner.querySelector(".rank-span");
      if (rankSpan) {
        if (isSelected) {
          rankSpan.className =
            "w-4 h-4 flex items-center justify-center rounded-full bg-white text-amber-600 text-[10px] font-extrabold shrink-0 rank-span";
        } else {
          rankSpan.className = `w-4 h-4 flex items-center justify-center rounded-full bg-white ${rankTextColor} text-[10px] font-extrabold shrink-0 rank-span`;
        }
      }
    });
  }, [selectedMapLocationId]);

  const handleFlyTo = (location: Location) => {
    showLocationDetails(location);
  };

  const handleMoveLocation = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rankedLocations.length) return;

    setRankedLocations((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const isAdmin =
    room.participants.find((p) => p._id === currentParticipantId)?.isAdmin ===
    true;

  // ─── Drag and drop handlers ───────────────────────────────────────────

  const handleDragStart = (locationId: string) => {
    setDraggingId(locationId);
  };

  // Called when a dragged card is hovering over another card
  // reorder the list in real time so the user sees the new position
  const handleDragOver = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;

    setHoverId(targetId);

    setRankedLocations((prev) => {
      const draggedIndex = prev.findIndex((l) => l._id === draggingId);
      const targetIndex = prev.findIndex((l) => l._id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const updated = [...prev];
      const [removed] = updated.splice(draggedIndex, 1); // remove dragged item
      updated.splice(targetIndex, 0, removed); // insert at target position
      return updated;
    });
  };

  // Called when the drag is released
  const handleDrop = () => {
    setDraggingId(null); // clear both on drop
    setHoverId(null);
  };

  // ─── Submit vote ──────────────────────────────────────────────────────

  const handleSubmitVote = async () => {
    if (rankedLocations.length === 0) return;
    setIsSubmitting(true);

    const payload: VotePayload = {
      participantId: currentParticipantId,
      rankings: rankedLocations.map((l) => l._id!),
    };

    try {
      await api.post(`/rooms/${room.code}/votes`, payload);
      setHasVoted(true);
      onVoteSubmitted?.();
      toast.success("Your vote has been submitted!");
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error("You have already voted.");
        setHasVoted(true);
        onVoteSubmitted?.();
      } else {
        toast.error("Failed to submit vote. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Admin close voting ───────────────────────────────────────────────

  const handleCloseVoting = async () => {
    setIsClosingVote(true);
    try {
      await api.put(`/rooms/${room.code}/status/completed`);
      toast.success("Voting closed!");
      onVotingClosed?.();
    } catch {
      toast.error("Failed to close voting.");
    } finally {
      setIsClosingVote(false);
    }
  };

  // ─── Sort by Travel Time ──────────────────────────────────────────────

  const handleSortByTravelTime = () => {
    setRankedLocations((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const timeA = routeDistances[a._id!]?.duration ?? Infinity;
        const timeB = routeDistances[b._id!]?.duration ?? Infinity;
        return timeA - timeB;
      });
      return sorted;
    });
    toast.success("Sorted by fastest travel time");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Voting details / List */}
        <div className="lg:col-span-5 space-y-6">
          <VotingHeader room={room} currentParticipant={currentParticipant} />

          {Object.values(routeDistances).some((r) => r.isFallbackToDriving) && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Driving Fallback Used
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-300 pl-6 leading-relaxed">
                No public transport routes could be detected for some locations,
                so a{" "}
                <span style={{ color: "#ec4899" }} className="font-bold">
                  pink driving route
                </span>{" "}
                is shown instead.
              </p>
            </div>
          )}

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

          {hasVoted ? (
            /* Confirmation message shown after voting */
            <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 p-6 text-center space-y-2">
              <Trophy className="w-10 h-10 text-green-500 mx-auto" />
              <p className="font-semibold text-green-700 dark:text-green-400">
                Your vote is in!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Waiting for the admin to close voting…
              </p>
            </div>
          ) : (
            <>
              {/* Instruction text and Sort */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Drag the cards to rank your preferences.{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Top = most preferred.
                  </span>
                </p>
                <button
                  onClick={handleSortByTravelTime}
                  title="Sort venues by the fastest travel time"
                  className="text-xs font-semibold px-2.5 py-1.5 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-gray-700 dark:text-gray-300 flex items-center gap-1.5 active:scale-95"
                >
                  <ArrowDownUp className="w-3.5 h-3.5" />
                  Sort by Time
                </button>
              </div>

              {/* Starting location selection card */}
              <div className="flex flex-col gap-2 p-3.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {room.meetingDirection === "from-venue"
                      ? "Return Destination (Home)"
                      : "Starting Location"}
                  </span>
                  {currentParticipant?.latitude &&
                  currentParticipant?.longitude ? (
                    <button
                      onClick={() => {
                        if (useLiveGPS) {
                          setUseLiveGPS(false);
                        } else if (gpsCoords) {
                          setUseLiveGPS(true);
                        } else {
                          requestGPS();
                        }
                      }}
                      className="text-xs text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Switch to {useLiveGPS ? "Suburb" : "Live GPS"}
                    </button>
                  ) : !gpsCoords ? (
                    <button
                      onClick={requestGPS}
                      className="text-xs text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Connect Live GPS
                    </button>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-950 dark:text-gray-50">
                  {useLiveGPS ? (
                    <div className="flex items-center gap-2 font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-450 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                      </span>
                      <span>Live GPS Coordinates</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-medium">
                      <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span className="truncate max-w-[240px]">
                        {currentParticipant?.location || "No suburb selected"}
                      </span>
                      {(!currentParticipant?.latitude ||
                        !currentParticipant?.longitude) && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0">
                          (un-geocoded)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Draggable list */}
              {rankedLocations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-400">
                  No locations have been added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {rankedLocations.map((location, index) => {
                    const category = room.categories.find(
                      (c) => c._id === location.category,
                    );
                    return (
                      <LocationCard
                        key={location._id}
                        location={location}
                        rank={index + 1}
                        category={category}
                        isDragging={draggingId === location._id}
                        isHovered={hoverId === location._id}
                        onDragStart={() => handleDragStart(location._id!)}
                        onDragOver={() => handleDragOver(location._id!)}
                        onDrop={handleDrop}
                        onViewMap={() => handleFlyTo(location)}
                        routeDetails={routeDistances[location._id!]}
                        isTransit={
                          currentParticipant?.transportationMode === "transit"
                        }
                        onMoveUp={() => handleMoveLocation(index, "up")}
                        onMoveDown={() => handleMoveLocation(index, "down")}
                        isFirst={index === 0}
                        isLast={index === rankedLocations.length - 1}
                      />
                    );
                  })}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmitVote}
                disabled={isSubmitting || rankedLocations.length === 0}
                className="btn btn-submit w-full flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit My Vote
                  </>
                )}
              </button>
            </>
          )}

          {/* Admin close voting button */}
          {isAdmin && (
            <AdminCloseButton
              isClosingVote={isClosingVote}
              onClose={handleCloseVoting}
            />
          )}
        </div>

        {/* Right column: Persistent Mapbox Map */}
        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Location Map
              </span>
              <span className="text-xs text-gray-450 dark:text-gray-450">
                Click pins to focus, or cards to fly
              </span>
            </div>
            <div className="relative h-[400px] lg:h-[600px] w-full bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
              <div
                ref={mapContainerRef}
                className="absolute inset-0 w-full h-full"
              />

              {/* Transit Legend Overlay */}
              {currentParticipant?.transportationMode === "transit" && (
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

// ─── Helper components ──────────────────────────────────────────────────

// The room name + voting status header
function VotingHeader({
  room,
  currentParticipant,
}: {
  room: Room;
  currentParticipant?: Participant;
}) {
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
          Voting is open — rank your preferred locations below.
        </p>
      </div>
      {currentParticipant && (
        <div className="flex flex-col items-end gap-1.5 self-start sm:self-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-600 dark:text-gray-400 shadow-sm">
            <span>Routing:</span>
            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
              {transportIcons[currentParticipant.transportationMode]}
              {transportLabels[currentParticipant.transportationMode]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// The admin close voting button
function AdminCloseButton({
  isClosingVote,
  onClose,
}: {
  isClosingVote: boolean;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-red-700 dark:text-red-400 text-sm">
          Admin controls
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Closing voting will calculate the winner immediately.
        </p>
      </div>
      <button
        onClick={onClose}
        disabled={isClosingVote}
        className="btn flex items-center gap-2 text-sm bg-red-600 text-white border-red-700 hover:bg-red-700 shrink-0"
      >
        {isClosingVote ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <X className="w-4 h-4" />
        )}
        {isClosingVote ? "Closing…" : "Close Voting"}
      </button>
    </div>
  );
}
