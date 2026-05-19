"use client";

import type { Room } from "@/types/room";
import ParticipantList from "./ParticipantList";
import AdminControls from "./AdminControls";
import ShareRoomCard from "./ShareRoomCard";
import { Users } from "lucide-react";

const POLL_INTERVAL_MS = 5000; // 5 seconds

interface Props {
  room: Room;
  currentUserId: string;
}

export default function LobbyView({ room, currentUserId }: Props) {
  const isAdmin =
    room?.adminUser === currentUserId ||
    room?.participants.find((p) => p.userId === currentUserId)?.isAdmin === true;

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