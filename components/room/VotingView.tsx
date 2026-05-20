"use client";

import { useState, useRef, useEffect } from "react";
import type { Room, Location, VotePayload } from "@/types/room";
import LocationCard from "./LocationCard";
import { Send, X, Trophy, Loader2 } from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosingVote, setIsClosingVote] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
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
    mapRef.current = map;

    // Fit to bounds once map loaded
    map.on("load", () => {
      if (room.locations.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        room.locations.forEach((loc) => {
          bounds.extend([loc.longitude, loc.latitude]);
        });
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 1000 });
      }
    });

    return () => {
      if (activePopupRef.current) {
        activePopupRef.current.remove();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [room.locations]);

  // Show details of a location on the map using a popup and focus center
  const showLocationDetails = (location: Location) => {
    setSelectedMapLocationId(location._id || null);

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 15,
        essential: true,
      });

      if (activePopupRef.current) {
        activePopupRef.current.remove();
      }

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
        .setLngLat([location.longitude, location.latitude])
        .setHTML(`
          <div class="p-2 text-xs text-gray-900 dark:text-white bg-white dark:bg-[#111] rounded-lg">
            <p class="font-bold mb-0.5">${location.name}</p>
            ${location.description ? `<p class="text-gray-500 dark:text-gray-400 font-medium truncate max-w-[150px]">${location.description}</p>` : ""}
          </div>
        `)
        .addTo(mapRef.current);

      activePopupRef.current = popup;
    }
  };

  // Sync labeled markers with rankedLocations ordering & selectedMapLocationId
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Render new markers
    rankedLocations.forEach((location, idx) => {
      const rank = idx + 1;
      const isSelected = location._id === selectedMapLocationId;
      const el = document.createElement("div");

      el.className = isSelected
        ? "flex items-center gap-1.5 bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded-full border-2 border-white dark:border-gray-900 shadow-2xl scale-110 z-50 ring-4 ring-amber-300 dark:ring-amber-900/50 transition-all duration-150 whitespace-nowrap cursor-pointer"
        : "flex items-center gap-1.5 bg-cyan-600 text-white font-semibold text-xs px-2.5 py-1 rounded-full border border-white dark:border-gray-900 shadow-md cursor-pointer hover:bg-cyan-500 transition-all duration-150 whitespace-nowrap";

      el.innerHTML = `
        <span class="w-4 h-4 flex items-center justify-center rounded-full bg-white text-cyan-600 text-[10px] font-extrabold shrink-0">${rank}</span>
        <span class="max-w-[120px] truncate">${location.name}</span>
      `;

      el.addEventListener("click", () => {
        showLocationDetails(location);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([location.longitude, location.latitude])
        .addTo(mapRef.current!);

      markersRef.current[location._id!] = marker;
    });
  }, [rankedLocations, selectedMapLocationId]);

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
      // TODO: stup rn, need to wire up to POST /api/rooms/:code/close-voting
      await api.post(`/rooms/${room.code}/close`);
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
          <VotingHeader room={room} />

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
function VotingHeader({ room }: { room: Room }) {
  return (
    <div className="space-y-1">
      <h1 className="text-gray-900 dark:text-white">{room.name}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Voting is open — rank your preferred locations below.
      </p>
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