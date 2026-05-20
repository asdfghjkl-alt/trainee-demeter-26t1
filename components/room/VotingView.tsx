"use client";

import { useState, useRef, useEffect } from "react";
import type { Room, Location, VotePayload, Participant, TransportationMode } from "@/types/room";
import LocationCard from "./LocationCard";
import { Send, X, Trophy, Loader2, Car, Train, PersonStanding, Bike, Bus, MapPin, RefreshCw } from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const transportIcons: Record<TransportationMode, React.ReactNode> = {
  bus: <Bus className="w-3.5 h-3.5" />,
  train: <Train className="w-3.5 h-3.5" />,
  metro: <Train className="w-3.5 h-3.5" />,
  driving: <Car className="w-3.5 h-3.5" />,
  cycling: <Bike className="w-3.5 h-3.5" />,
  walking: <PersonStanding className="w-3.5 h-3.5" />,
};

const transportLabels: Record<TransportationMode, string> = {
  bus: "Bus",
  train: "Train",
  metro: "Metro",
  driving: "Driving",
  cycling: "Cycling",
  walking: "Walking",
};

interface Props {
  room: Room;
  currentParticipantId: string;
  onVotingClosed?: () => void;
}

export default function VotingView({ room, currentParticipantId, onVotingClosed }: Props) {

  // ─── State ───────────────────────────────────────────────────────────

  const [rankedLocations, setRankedLocations] = useState<Location[]>(
    room.locations
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
        }
      } catch (err) {
        console.error("Error checking voting status:", err);
      }
    };
    if (room.code && currentParticipantId) {
      checkHasVoted();
    }
  }, [room.code, currentParticipantId]);

  useEffect(() => {
    setRankedLocations(room.locations);
  }, [room.locations]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosingVote, setIsClosingVote] = useState(false);

  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [useLiveGPS, setUseLiveGPS] = useState(false);

  const currentParticipant = room.participants.find((p) => p._id === currentParticipantId);

  // Active origin coordinates (use live GPS if toggled & active, otherwise fall back to geocoded joined suburb)
  const activeOrigin = useLiveGPS && gpsCoords
    ? gpsCoords
    : (currentParticipant?.latitude && currentParticipant?.longitude
      ? { latitude: currentParticipant.latitude, longitude: currentParticipant.longitude }
      : gpsCoords); // fallback to GPS if no suburb coordinates

  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const prevOriginRef = useRef<string | null>(null);
  const prevLocationsCountRef = useRef<number>(0);

  interface RouteDetails {
    distance: number;
    duration: number;
    geometry?: any;
  }
  const [routeDistances, setRouteDistances] = useState<{ [locationId: string]: RouteDetails }>({});

  const mapToMapboxProfile = (mode?: string): string => {
    switch (mode) {
      case "walking":
        return "walking";
      case "cycling":
        return "cycling";
      case "driving":
      case "bus":
      case "train":
      case "metro":
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
          toast.error("Could not access GPS. Please check browser permissions.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  // Fetch travel routes and distances from Mapbox Directions API using activeOrigin (in parallel)
  useEffect(() => {
    if (!activeOrigin || room.locations.length === 0) {
      setRouteDistances({});
      return;
    }

    const fetchRoutes = async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;

      const profile = mapToMapboxProfile(currentParticipant?.transportationMode);
      const newDistances: { [id: string]: RouteDetails } = {};

      const promises = room.locations.map(async (loc) => {
        try {
          const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${activeOrigin.longitude},${activeOrigin.latitude};${loc.longitude},${loc.latitude}?access_token=${token}&geometries=geojson`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.routes?.[0]) {
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
          console.error("Error fetching Mapbox Directions route:", err);
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
  }, [activeOrigin, room.locations, currentParticipant?.transportationMode]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const [selectedMapLocationId, setSelectedMapLocationId] = useState<string | null>(null);
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
      map.remove();
      setMapInstance(null);
    };
  }, []);

  // Fit map bounds to include all locations and user starting location (runs once on load or when structurally changed)
  useEffect(() => {
    if (!mapInstance || !mapInstance.getCanvasContainer || !mapInstance.getCanvasContainer()) return;

    const originKey = activeOrigin ? `${activeOrigin.latitude},${activeOrigin.longitude}` : null;
    const locationsCount = room.locations.length;

    // Only run fitBounds if the map is freshly loaded, or if the origin or locations count actually changed
    const hasChanged = originKey !== prevOriginRef.current || locationsCount !== prevLocationsCountRef.current;
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
    console.log("showLocationDetails called for:", location.name, "mapInstance is present:", !!mapInstance);
    setSelectedMapLocationId(location._id || null);

    if (mapInstance && mapInstance.getCanvasContainer && mapInstance.getCanvasContainer()) {
      console.log("Executing easeTo for:", location.name);
      mapInstance.easeTo({
        center: [location.longitude, location.latitude],
        zoom: 15,
        duration: 400,
      });

      if (activePopupRef.current) {
        activePopupRef.current.remove();
      }

      // Find route details
      const route = routeDistances[location._id!];

      const popupHtml = `
        <div class="p-2 text-xs text-gray-900 dark:text-white bg-white dark:bg-[#111] rounded-lg">
          <p class="font-bold mb-0.5">${location.name}</p>
          ${location.description ? `<p class="text-gray-500 dark:text-gray-400 font-medium truncate max-w-[150px] mb-1">${location.description}</p>` : ""}
          ${route ? `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
              <span>${(route.distance / 1000).toFixed(1)} km</span>
              <span class="text-gray-300 dark:text-gray-700">•</span>
              <span>${Math.round(route.duration / 60)} mins</span>
            </div>
          ` : ""}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
        .setLngLat([location.longitude, location.latitude])
        .setHTML(popupHtml)
        .addTo(mapInstance);

      activePopupRef.current = popup;

      // Draw route path on the map
      if (route?.geometry) {
        if (mapInstance.getSource("route")) {
          (mapInstance.getSource("route") as mapboxgl.GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
        } else {
          mapInstance.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            },
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
              "line-color": "#3b82f6", // tailwind blue-500
              "line-width": 5,
              "line-opacity": 0.75,
            },
          });
        }
      } else {
        // Clear route path
        if (mapInstance.getSource("route")) {
          (mapInstance.getSource("route") as mapboxgl.GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          });
        }
      }
    }
  };

  const showLocationDetailsRef = useRef(showLocationDetails);
  showLocationDetailsRef.current = showLocationDetails;

  // Sync labeled markers with rankedLocations ordering & activeOrigin (DOM nodes only created/destroyed when list changes)
  useEffect(() => {
    if (!mapInstance || !mapInstance.getCanvasContainer || !mapInstance.getCanvasContainer()) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Render new markers
    rankedLocations.forEach((location, idx) => {
      const rank = idx + 1;
      const el = document.createElement("div");

      // Custom inner wrapper to keep Mapbox's classes intact on the outer container
      const inner = document.createElement("div");
      inner.className = "marker-inner flex items-center gap-1.5 bg-cyan-600 text-white font-semibold text-xs px-2.5 py-1 rounded-full border border-white dark:border-gray-900 shadow-md cursor-pointer hover:bg-cyan-500 transition-all duration-150 whitespace-nowrap pointer-events-auto";
      inner.setAttribute("data-rank", rank.toString());

      inner.innerHTML = `
        <span class="w-4 h-4 flex items-center justify-center rounded-full bg-white text-cyan-600 text-[10px] font-extrabold shrink-0 rank-span">${rank}</span>
        <span class="max-w-[120px] truncate">${location.name}</span>
      `;
      el.appendChild(inner);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([location.longitude, location.latitude])
        .addTo(mapInstance);

      const handleInteraction = (e: Event) => {
        console.log(`Marker interaction [${e.type}] triggered for:`, location.name);
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
    if (activeOrigin) {
      const el = document.createElement("div");
      el.className = "relative flex items-center justify-center w-6 h-6 z-[60]";
      el.innerHTML = `
        <span class="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping"></span>
        <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-600 border border-white shadow-md"></span>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([activeOrigin.longitude, activeOrigin.latitude])
        .addTo(mapInstance);

      const originLabel = useLiveGPS ? "Your GPS Location" : `Your Suburb: ${currentParticipant?.location || "Starting Point"}`;
      const popup = new mapboxgl.Popup({ offset: 10, closeButton: false })
        .setHTML(`<div class="p-1.5 text-[10px] font-bold text-gray-700 dark:text-gray-300">${originLabel}</div>`);

      marker.setPopup(popup);
      userMarkerRef.current = marker;
    }
  }, [mapInstance, rankedLocations, activeOrigin]);

  // Update marker selection classes in place without destroying/recreating DOM elements
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const el = marker.getElement();
      const inner = el.querySelector(".marker-inner") as HTMLDivElement | null;
      if (!inner) return;

      const isSelected = id === selectedMapLocationId;
      const rank = inner.getAttribute("data-rank") || "1";

      inner.className = isSelected
        ? "marker-inner flex items-center gap-1.5 bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded-full border-2 border-white dark:border-gray-900 shadow-2xl scale-110 z-50 ring-4 ring-amber-300 dark:ring-amber-900/50 transition-all duration-150 whitespace-nowrap cursor-pointer pointer-events-auto"
        : "marker-inner flex items-center gap-1.5 bg-cyan-600 text-white font-semibold text-xs px-2.5 py-1 rounded-full border border-white dark:border-gray-900 shadow-md cursor-pointer hover:bg-cyan-500 transition-all duration-150 whitespace-nowrap pointer-events-auto";

      const rankSpan = inner.querySelector(".rank-span");
      if (rankSpan) {
        if (isSelected) {
          rankSpan.className = "w-4 h-4 flex items-center justify-center rounded-full bg-white text-amber-600 text-[10px] font-extrabold shrink-0 rank-span";
        } else {
          rankSpan.className = "w-4 h-4 flex items-center justify-center rounded-full bg-white text-cyan-600 text-[10px] font-extrabold shrink-0 rank-span";
        }
      }
    });
  }, [selectedMapLocationId]);

  const handleFlyTo = (location: Location) => {
    showLocationDetails(location);
  };

  const isAdmin = room.participants.find((p) => p._id === currentParticipantId)?.isAdmin === true;

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
      updated.splice(targetIndex, 0, removed);           // insert at target position
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
      toast.success("Your vote has been submitted!");
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error("You have already voted.");
        setHasVoted(true);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left column: Voting details / List */}
        <div className="lg:col-span-5 space-y-6">
          <VotingHeader room={room} currentParticipant={currentParticipant} />

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
              {/* Instruction text */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Drag the cards to rank your preferences.{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Top = most preferred.
                </span>
              </p>

              {/* Starting location selection card */}
              <div className="flex flex-col gap-2 p-3.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Starting Location
                  </span>
                  {currentParticipant?.latitude && currentParticipant?.longitude ? (
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
                      {(!currentParticipant?.latitude || !currentParticipant?.longitude) && (
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
                      (c) => c._id === location.category
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
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Helper components ──────────────────────────────────────────────────

// The room name + voting status header
function VotingHeader({ room, currentParticipant }: { room: Room; currentParticipant?: Participant }) {
  const isTransit = currentParticipant && ["bus", "train", "metro"].includes(currentParticipant.transportationMode);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-850 pb-4">
      <div className="space-y-1">
        <h1 className="text-gray-900 dark:text-white">{room.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
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
          {isTransit && (
            <span className="text-[9px] text-gray-400 dark:text-gray-500 text-right max-w-[180px] leading-tight">
              * Routing calculated using road networks
            </span>
          )}
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
        className="btn flex items-center gap-2 text-sm bg-red-600 text-white border-red-700 hover:bg-red-700 flex-shrink-0"
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