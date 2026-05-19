"use client";

import { useEffect, useState, useCallback } from "react";
import type { Room } from "@/types/room";
import { getRoom } from "@/lib/rooms";
import ParticipantList from "./ParticipantList";
import AdminControls from "./AdminControls";
import ShareRoomCard from "./ShareRoomCard";
import { Users } from "lucide-react";

const POLL_INTERVAL_MS = 5000; // 5 seconds

interface Props {
  initialRoom: Room;
  currentUserId: string;
}

export default function LobbyView({ initialRoom, currentUserId }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await getRoom(initialRoom.code);
      if (!data) {
        setError("Room not found.");
        return;
      }
      setRoom(data);
    } catch {
      setError("Failed to load room.");
    }
  }, [initialRoom.code]);

  // Poll for updates every POLL_INTERVAL_MS
  useEffect(() => {
    const interval = setInterval(fetchRoom, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const isAdmin =
    room.adminUser === currentUserId ||
    room.participants.find((p) => p.userId === currentUserId)?.isAdmin === true;

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
      <div className="space-y-1">
        <h1 className="text-gray-900 dark:text-white">{room.name}</h1>
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
        <AdminControls room={room} />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
          <p className="font-medium">Waiting for the admin to start voting…</p>
          <p className="text-sm mt-1">Sit tight! You'll be redirected automatically.</p>
        </div>
      )}
    </div>
  );
}