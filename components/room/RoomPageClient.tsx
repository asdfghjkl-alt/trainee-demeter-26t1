"use client";

import { useState, useEffect, useCallback } from "react";
import type { Room } from "@/types/room";
import { getRoom } from "@/lib/rooms";
import LobbyView from "./LobbyView";
import VotingView from "./VotingView";
import { Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 5000;

interface Props {
  initialRoom: Room;
  currentParticipantId: string;
}

export default function RoomPageClient({ initialRoom, currentParticipantId }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await getRoom(initialRoom.code, currentParticipantId);
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
  }, [initialRoom.code, currentParticipantId]);

  useEffect(() => {
    fetchRoom();

    // Do not poll automatically if the room is in the voting phase to avoid disrupting user interaction
    if (room?.status === "voting") {
      return;
    }

    const interval = setInterval(fetchRoom, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRoom, room?.status]);

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
  //   waiting           → lobby (waiting for participants)
  //   voting            → voting (locations generated, voting in progress)
  //   completed/closed  → results (ITER1-019, not yet built)

  if (room.status === "waiting") {
    return (
      <LobbyView
        initialRoom={room}
        currentParticipantId={currentParticipantId}
        onRoomUpdate={setRoom}
      />
    );
  }

  if (room.status === "voting") {
    return (
      <VotingView
        room={room}
        currentParticipantId={currentParticipantId}
        onVotingClosed={fetchRoom}
      />
    );
  }

  if (room.status === "completed" || room.status === "closed") {
    // ITER1-019 will build this, placeholder for nowwww
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Results coming soon (ITER1-019).</p>
      </div>
    );
  }

  return null;
}