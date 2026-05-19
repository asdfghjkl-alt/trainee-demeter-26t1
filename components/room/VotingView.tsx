"use client";

import { useState, useRef } from "react";
import type { Room, Location, VotePayload } from "@/types/room";
import LocationCard from "./LocationCard";
import { Send, X, Trophy, Loader2 } from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

interface Props {
  room: Room;
  currentUserId: string;
  onVotingClosed?: () => void; 
}

export default function VotingView({ room, currentUserId, onVotingClosed }: Props) {

  // ─── State ───────────────────────────────────────────────────────────

  const [rankedLocations, setRankedLocations] = useState<Location[]>(
    room.locations
  );

  const draggedId = useRef<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosingVote, setIsClosingVote] = useState(false);

  const isAdmin = room.adminUser === currentUserId;

  // ─── Drag and drop handlers ───────────────────────────────────────────

  const handleDragStart = (locationId: string) => {
    draggedId.current = locationId;
  };

  // Called when a dragged card is hovering over another card
  // reorder the list in real time so the user sees the new position
  const handleDragOver = (targetId: string) => {
    if (!draggedId.current || draggedId.current === targetId) return;

    setRankedLocations((prev) => {
      const draggedIndex = prev.findIndex((l) => l._id === draggedId.current);
      const targetIndex = prev.findIndex((l) => l._id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const updated = [...prev];
      const [removed] = updated.splice(draggedIndex, 1); // remove dragged item
      updated.splice(targetIndex, 0, removed);           // insert at target position
      return updated;
    });
  };

  // Called when the drag is released
  const handleDrop = () => {
    draggedId.current = null;
  };

  // ─── Submit vote ──────────────────────────────────────────────────────

  const handleSubmitVote = async () => {
    if (rankedLocations.length === 0) return;
    setIsSubmitting(true);

    const payload: VotePayload = {
      rankings: rankedLocations.map((l) => l._id!),
    };

    try {
      await api.post(`/rooms/${room.code}/vote`, payload);
      setHasVoted(true);
      toast.success("Your vote has been submitted!");
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error("You have already voted.");
        setHasVoted(true);
      } else {
        toast.error("Failed to submit vote. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Admin close voting ───────────────────────────────────────────────

  const handleCloseVoting = async () => {
    setIsClosingVote(true);
    try {
      // TODO: stup rn, need to wire up to POST /api/rooms/:code/close-voting
      await api.post(`/rooms/${room.code}/close`);
      toast.success("Voting closed!");
      onVotingClosed?.();
    } catch {
      toast.error("Failed to close voting.");
    } finally {
      setIsClosingVote(false);
    }
  };

  // ─── Render: already voted ────────────────────────────────────────────

  if (hasVoted) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <VotingHeader room={room} />

        {/* Confirmation message shown after voting */}
        <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 p-6 text-center space-y-2">
          <Trophy className="w-10 h-10 text-green-500 mx-auto" />
          <p className="font-semibold text-green-700 dark:text-green-400">
            Your vote is in!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Waiting for the admin to close voting…
          </p>
        </div>

        {/* Admin still sees the close button even after voting */}
        {isAdmin && (
          <AdminCloseButton
            isClosingVote={isClosingVote}
            onClose={handleCloseVoting}
          />
        )}
      </div>
    );
  }

  // ─── Render: voting form ──────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <VotingHeader room={room} />

      {/* Instruction text */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Drag the cards to rank your preferences.{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Top = most preferred.
        </span>
      </p>

      {/* No locations yet */}
      {rankedLocations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-400">
          No locations have been added yet.
        </div>
      ) : (
        // The draggable list of location cards
        <div className="space-y-3">
          {rankedLocations.map((location, index) => {
            // Find the matching category object so we can show its name
            const category = room.categories.find(
              (c) => c._id === location.category
            );

            return (
              <LocationCard
                key={location._id}
                location={location}
                rank={index + 1}
                category={category}
                isDragging={draggedId.current === location._id}
                onDragStart={() => handleDragStart(location._id!)}
                onDragOver={() => handleDragOver(location._id!)}
                onDrop={handleDrop}
              />
            );
          })}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmitVote}
        disabled={isSubmitting || rankedLocations.length === 0}
        className="btn btn-submit w-full flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit My Vote
          </>
        )}
      </button>

      {/* Admin close voting button */}
      {isAdmin && (
        <AdminCloseButton
          isClosingVote={isClosingVote}
          onClose={handleCloseVoting}
        />
      )}
    </div>
  );
}

// ─── Helper components ──────────────────────────────────────────────────

// The room name + voting status header
function VotingHeader({ room }: { room: Room }) {
  return (
    <div className="space-y-1">
      <h1 className="text-gray-900 dark:text-white">{room.name}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Voting is open — rank your preferred locations below.
      </p>
    </div>
  );
}

// The admin close voting button
function AdminCloseButton({
  isClosingVote,
  onClose,
}: {
  isClosingVote: boolean;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-red-700 dark:text-red-400 text-sm">
          Admin controls
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Closing voting will calculate the winner immediately.
        </p>
      </div>
      <button
        onClick={onClose}
        disabled={isClosingVote}
        className="btn flex items-center gap-2 text-sm bg-red-600 text-white border-red-700 hover:bg-red-700 flex-shrink-0"
      >
        {isClosingVote ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <X className="w-4 h-4" />
        )}
        {isClosingVote ? "Closing…" : "Close Voting"}
      </button>
    </div>
  );
}