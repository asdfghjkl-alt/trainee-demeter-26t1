"use client";

import { useState, useEffect, useCallback } from "react";
import type { Room } from "@/types/room";
import { MOCK_ROOM } from "@/lib/rooms";
import LobbyView from "./LobbyView";
import VotingView from "./VotingView";
import { Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 5000;

interface Props {
  code: string;
  currentUserId: string;
}

export default function RoomPageClient({ code, currentUserId }: Props) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      // TODO: replace with real API call when Edward's route is ready
      // const data = await getRoom(code);
      const data = MOCK_ROOM;
      if (!data) { setError("Room not found."); return; }
      setRoom(data);
    } catch {
      setError("Failed to load room.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRoom]);

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

  // ── Route to the right view based on room status ──────────────────────
  //   open   → lobby (waiting for participants)
  //   closed → voting (locations generated, voting in progress)
  //   ended  → results (ITER1-019, not yet built)

  if (room.status === "open") {
    return <LobbyView room={room} currentUserId={currentUserId} />;
  }

  if (room.status === "closed") {
    return (
      <VotingView
        room={room}
        currentUserId={currentUserId}
        onVotingClosed={fetchRoom}
      />
    );
  }

  if (room.status === "ended") {
    // ITER1-019 will build this, placeholder for nowwww
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Results coming soon (ITER1-019).</p>
      </div>
    );
  }

  return null;
}