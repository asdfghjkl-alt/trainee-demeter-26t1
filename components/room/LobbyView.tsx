"use client";

import type { Room } from "@/types/room";
import ParticipantList from "./ParticipantList";
import AdminControls from "./AdminControls";
import ShareRoomCard from "./ShareRoomCard";
import AdminLocationManager from "./AdminLocationManager";
import DietarySummary from "./DietarySummary";
import { getRoom } from "@/lib/rooms";
import { useState, useEffect, useCallback } from "react";
import { Users, Calendar } from "lucide-react";

const POLL_INTERVAL_MS = 5000; // 5 seconds

interface Props {
  initialRoom: Room;
  currentParticipantId: string;
  onRoomUpdate?: (room: Room) => void;
}

export default function LobbyView({
  initialRoom,
  currentParticipantId,
  onRoomUpdate,
}: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [error, setError] = useState<string | null>(null);

  // Sync state when initialRoom from parent changes
  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await getRoom(initialRoom.code, currentParticipantId);
      if (!data) {
        setError("Room not found.");
        return;
      }
      setRoom(data);
      onRoomUpdate?.(data);
    } catch {
      setError("Failed to load room.");
    }
  }, [initialRoom.code, currentParticipantId, onRoomUpdate]);

  // Poll for updates every POLL_INTERVAL_MS
  useEffect(() => {
    const interval = setInterval(fetchRoom, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const isAdmin =
    room.participants.find((p) => p._id === currentParticipantId)?.isAdmin ===
    true;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-gray-900 dark:text-white">{room.name}</h1>
        {room.categories && room.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.categories.map((cat) => (
              <span
                key={cat._id}
                className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}
        {room.date && (
          <div className="flex items-center gap-1.5 text-sm text-cyan-600 dark:text-cyan-400 font-medium">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(room.date).toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        )}
        {room.description && (
          <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap bg-gray-50/50 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800/80">
            {room.description}
          </p>
        )}
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Share the code or link below so everyone can join.
        </p>
      </div>

      {/* Share card */}
      <ShareRoomCard code={room.code} />

      {/* Participants */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Users className="w-5 h-5" />
          <h2 className="text-base font-semibold">
            Participants ({room.participants.length})
          </h2>
        </div>
        <ParticipantList participants={room.participants} />
      </section>

      {/* Admin vs participant view */}
      {isAdmin ? (
        <div className="space-y-8">
          <DietarySummary participants={room.participants} />
          <AdminLocationManager room={room} onRoomUpdate={fetchRoom} />
          <AdminControls room={room} onRoomUpdate={fetchRoom} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
          <p className="font-medium">Waiting for the admin to start voting…</p>
          <p className="text-sm mt-1">
            Sit tight! You'll be redirected automatically.
          </p>
        </div>
      )}
    </div>
  );
}
