"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import type { Room, LocationResult } from "@/types/room";
import api from "@/lib/axios";
import axios from "axios";
import { Trophy, Loader2, MapPin, Home, ExternalLink } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  room: Room;
  currentParticipantId: string;
}

export default function ResultsView({ room, currentParticipantId }: Props) {
  const [results, setResults] = useState<LocationResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/rooms/${room.code}/results`, {
          params: { participantId: currentParticipantId },
        });
        setResults(res.data.results);
      } catch (err: unknown) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
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

  // Initialize the Mapbox map once results have loaded so the container is mounted
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
      map.remove();
      setMapInstance(null);
    };
  }, [results]);

  // Render markers and fit bounds once both the map and results are ready
  useEffect(() => {
    if (!mapInstance || !results || results.length === 0) return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const bounds = new mapboxgl.LngLatBounds();
    const anyVotes = results.some((r) => r.votes > 0);

    results.forEach((loc) => {
      const isWinner = anyVotes && loc.rank === 1;
      const el = document.createElement("div");
      const inner = document.createElement("div");
      inner.className = isWinner
        ? "flex items-center gap-1.5 bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded-full border border-white dark:border-gray-900 shadow-md whitespace-nowrap"
        : "flex items-center gap-1.5 bg-cyan-600 text-white font-semibold text-xs px-2.5 py-1 rounded-full border border-white dark:border-gray-900 shadow-md whitespace-nowrap";

      const badge = isWinner
        ? `<span class="w-4 h-4 flex items-center justify-center text-[11px]">🏆</span>`
        : `<span class="w-4 h-4 flex items-center justify-center rounded-full bg-white text-cyan-600 text-[10px] font-extrabold shrink-0">${loc.rank}</span>`;

      inner.innerHTML = `${badge}<span class="max-w-[120px] truncate">${escapeHtml(loc.name)}</span>`;
      el.appendChild(inner);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(mapInstance);

      markersRef.current[loc._id!] = marker;
      bounds.extend([loc.longitude, loc.latitude]);
    });

    mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 0 });
  }, [mapInstance, results]);

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

  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
  const hasAnyVotes = totalVotes > 0;
  const winners = hasAnyVotes ? results.filter((r) => r.rank === 1) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Header room={room} />

          {hasAnyVotes ? <Podium winners={winners} /> : <NoVotesCard />}

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
                {hasAnyVotes ? "Winner(s) highlighted in amber" : "No votes were cast"}
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
            <span className="hidden sm:inline text-gray-300 dark:text-gray-750">|</span>
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

function Podium({ winners }: { winners: LocationResult[] }) {
  if (winners.length === 1) {
    const w = winners[0];
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 p-6 text-center space-y-3 shadow-sm">
        <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Winner
        </p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{w.name}</h2>
        {w.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{w.description}</p>
        )}
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          {w.votes} {w.votes === 1 ? "vote" : "votes"}
        </p>
        <a
          href={mapsUrl(w)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white border-amber-600 hover:opacity-100"
        >
          <MapPin className="w-4 h-4" />
          Open in Google Maps
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">It&apos;s a tie!</h2>
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
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{w.name}</h3>
            {w.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {w.description}
              </p>
            )}
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {w.votes} {w.votes === 1 ? "vote" : "votes"}
            </p>
            <a
              href={mapsUrl(w)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
            >
              <MapPin className="w-3 h-3" />
              Open in Maps
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoVotesCard() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-6 text-center space-y-2">
      <p className="font-semibold text-gray-700 dark:text-gray-300">No votes were cast</p>
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
                  <p className="text-xs text-gray-400 mt-0.5">No first-preference votes</p>
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
