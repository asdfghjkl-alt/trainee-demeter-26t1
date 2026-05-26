import React from "react";
import type { Participant, TransportationMode } from "@/types/room";
import { Car, Train, PersonStanding, Bike, Crown, User, UserRound, Bus } from "lucide-react";

const transportIcons: Record<TransportationMode, React.ReactNode> = {
  transit: <Train className="w-4 h-4" />,
  driving: <Car className="w-4 h-4" />,
  cycling: <Bike className="w-4 h-4" />,
  walking: <PersonStanding className="w-4 h-4" />,
};

const transportLabels: Record<TransportationMode, string> = {
  transit: "Transit",
  driving: "Driving",
  cycling: "Cycling",
  walking: "Walking",
};

interface Props {
  participants: Participant[];
}

export default function ParticipantList({ participants }: Props) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
        No participants yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {participants.map((p, i) => (
        <li
          key={p._id ?? p.userId ?? i}
          className="grid grid-cols-[1.2fr_2fr_1fr] items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] px-4 py-3 gap-4"
        >
          {/* Name + user/admin badge slot */}
          <div className="flex items-center gap-3 min-w-0 col-span-1">
            {/* Fixed-width icon slot guarantees perfect name alignment */}
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {p.isAdmin ? (
                <Crown
                  className="w-4.5 h-4.5 text-amber-500"
                  aria-label="Admin"
                />
              ) : p.isGuest ? (
                <UserRound
                  className="w-4 h-4 text-gray-400 dark:text-gray-500"
                  aria-label="Guest"
                />
              ) : (
                <User
                  className="w-4 h-4 text-cyan-600 dark:text-cyan-400"
                  aria-label="Registered User"
                />
              )}
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {p.name}
            </span>
            {p.isGuest && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 shrink-0 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                guest
              </span>
            )}
            {p.willingness && p.willingness !== "medium" && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-600 dark:text-cyan-400 shrink-0 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 py-0.5 rounded">
                {p.willingness === "low" ? "local" : "flexible"}
              </span>
            )}
          </div>

          {/* Location */}
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate text-center col-span-1">
            {p.location}
          </span>

          {/* Transport */}
          <div
            className="flex items-center justify-end gap-1.5 text-sm text-gray-500 dark:text-gray-400 min-w-0 col-span-1"
            title={transportLabels[p.transportationMode]}
          >
            {transportIcons[p.transportationMode]}
            <span className="hidden sm:inline truncate">
              {transportLabels[p.transportationMode]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

