"use client";

import Link from "next/link";
import {
  Crown,
  Users,
  Clock,
  CheckCircle2,
  Vote,
  MapPin,
  XCircle,
} from "lucide-react";
import type { Room } from "@/types/room";

interface Props {
  ownedRooms: Room[];
  joinedRooms: Room[];
  currentUserId: string;
}

const statusConfig = {
  waiting: {
    label: "Waiting",
    icon: Clock,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  voting: {
    label: "Voting",
    icon: Vote,
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  },
};

function RoomCard({
  room,
  currentUserId,
}: {
  room: Room;
  currentUserId: string;
}) {
  const isOwner = room.adminUser === currentUserId;
  const status = statusConfig[room.status] ?? statusConfig.waiting;
  const StatusIcon = status.icon;

  // Up to 3 top participants, admin first
  const sorted = [...room.participants].sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return 0;
  });
  const top3 = sorted.slice(0, 3);
  const overflow = room.participants.length - 3;

  const createdDate = new Date(room.createdAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/rooms/${room.code}`}
      className="group relative flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] overflow-hidden hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-200"
    >
      {/* Top accent bar */}
      <div
        className={`h-1 w-full ${
          room.status === "completed"
            ? "bg-linear-to-r from-green-400 to-emerald-500"
            : room.status === "voting"
              ? "bg-linear-to-r from-blue-400 to-indigo-500"
              : room.status === "closed"
                ? "bg-gray-200 dark:bg-gray-700"
                : "bg-linear-to-r from-cyan-400 to-blue-500"
        }`}
      />

      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {room.name}
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono tracking-wider">
              #{room.code}
            </span>
          </div>

          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold shrink-0 ${status.className}`}
          >
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>

        {/* Categories */}
        {room.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.categories.slice(0, 3).map((cat) => (
              <span
                key={cat._id}
                className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
              >
                {cat.name}
              </span>
            ))}
            {room.categories.length > 3 && (
              <span className="px-2 py-0.5 text-[11px] text-gray-400 dark:text-gray-500 rounded-full">
                +{room.categories.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Locations count */}
        {room.locations.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {room.locations.length} location
              {room.locations.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Participants preview */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {top3.map((p) => (
                <div
                  key={p._id}
                  title={p.name}
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-[#111] bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {overflow > 0 && (
                <div className="w-7 h-7 rounded-full border-2 border-white dark:border-[#111] bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                  +{overflow}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {room.participants.length}
            </span>
          </div>

          {/* Owner badge + date */}
          <div className="flex items-center gap-2">
            {isOwner && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <Crown className="w-3 h-3" />
                Owner
              </span>
            )}
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {createdDate}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SectionEmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-10 text-center">
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
    </div>
  );
}

function SectionHeading({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {label}
        </h2>
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

export default function RoomsGrid({
  ownedRooms,
  joinedRooms,
  currentUserId,
}: Props) {
  const hasAny = ownedRooms.length > 0 || joinedRooms.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
          No rooms yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Create a room or ask a friend for their join code to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Rooms Owned */}
      <section>
        <SectionHeading
          icon={<Crown className="w-4 h-4 text-amber-500" />}
          label="Rooms Owned"
          count={ownedRooms.length}
        />
        {ownedRooms.length === 0 ? (
          <SectionEmptyState message="You haven't created any rooms yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedRooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Rooms Joined */}
      <section>
        <SectionHeading
          icon={<Users className="w-4 h-4 text-cyan-500" />}
          label="Rooms Joined"
          count={joinedRooms.length}
        />
        {joinedRooms.length === 0 ? (
          <SectionEmptyState message="You haven't joined any rooms yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedRooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
