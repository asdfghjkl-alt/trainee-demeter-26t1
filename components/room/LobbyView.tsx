"use client";

import { useEffect, useState, useCallback } from "react";
import type { Room } from "@/types/room";
import { MOCK_ROOM } from "@/lib/rooms"; // swap for real API call later
import ParticipantList from "./ParticipantList";
import AdminControls from "./AdminControls";
import ShareRoomCard from "./ShareRoomCard";
import { Users, Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 5000; // 5 seconds

interface Props {
  code: string;
  currentUserId: string;
}

export default function LobbyView({ code, currentUserId }: Props) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      // TODO: replace MOCK_ROOM with real call once Edward's route is ready:
      // const data = await getRoom(code);
      const data = MOCK_ROOM;
      if (!data) {
        setError("Room not found.");
        return;
      }
      setRoom(data);
    } catch {
      setError("Failed to load room.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  // Initial fetch + polling
  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const isAdmin =
    room?.adminUser === currentUserId ||
    room?.participants.find((p) => p.userId === currentUserId)?.isAdmin === true;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-500">{error ?? "Room not found."}</p>
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