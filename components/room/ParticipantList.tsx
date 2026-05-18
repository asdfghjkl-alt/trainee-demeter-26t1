import type { Participant, TransportationMode } from "@/types/room";
import { Car, Train, PersonStanding, Bike, Crown } from "lucide-react";

const transportIcons: Record<TransportationMode, React.ReactNode> = {
  driving: <Car className="w-4 h-4" />,
  transit: <Train className="w-4 h-4" />,
  walking: <PersonStanding className="w-4 h-4" />,
  cycling: <Bike className="w-4 h-4" />,
};

const transportLabels: Record<TransportationMode, string> = {
  driving: "Driving",
  transit: "Public transit",
  walking: "Walking",
  cycling: "Cycling",
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
      {participants.map((p) => (
        <li
          key={p._id}
          className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] px-4 py-3 gap-3"
        >
          {/* Name + admin badge */}
          <div className="flex items-center gap-2 min-w-0">
            {p.isAdmin && (
              <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" aria-label="Admin" />
            )}
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {p.name}
            </span>
            {p.isGuest && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                (guest)
              </span>
            )}
          </div>

          {/* Location */}
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1 text-center">
            {p.location}
          </span>

          {/* Transport */}
          <div
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 flex-shrink-0"
            title={transportLabels[p.transportationMode]}
          >
            {transportIcons[p.transportationMode]}
            <span className="hidden sm:inline">
              {transportLabels[p.transportationMode]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}