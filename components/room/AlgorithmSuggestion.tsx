"use client";

import { Sparkles } from "lucide-react";
import type { AlgorithmSuggestion, Location } from "@/types/room";

interface Props {
  suggestion?: AlgorithmSuggestion;
  locations: Location[];
  /** Tightens spacing when shown inside a sidebar / dense panel. */
  compact?: boolean;
}

/**
 * Informational callout — shows the venue that minimizes the worst-case
 * commute across all participants (ties broken by smallest spread).
 *
 * Renders nothing if the suggestion is missing (e.g. no geolocated
 * participants at the time voting opened).
 */
export default function AlgorithmSuggestion({
  suggestion,
  locations,
  compact = false,
}: Props) {
  if (!suggestion) return null;

  const winner = locations.find((l) => l._id === suggestion.winnerLocationId);
  if (!winner) return null;

  const winnerScore = suggestion.scores[suggestion.winnerLocationId];

  return (
    <div
      className={`rounded-2xl border border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/30 shadow-xs ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center">
          <Sparkles className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            Fairest commute (algorithm pick)
          </p>
          <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
            {winner.name}
          </h3>
          {winnerScore && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Everyone within{" "}
              <span className="font-semibold text-violet-700 dark:text-violet-300">
                {Math.round(winnerScore.maxMinutes)} min
              </span>{" "}
              · avg{" "}
              <span className="font-semibold text-violet-700 dark:text-violet-300">
                {Math.round(winnerScore.meanMinutes)} min
              </span>
              {winnerScore.stddevMinutes > 0 && (
                <>
                  {" "}
                  · spread ±
                  <span className="font-semibold text-violet-700 dark:text-violet-300">
                    {Math.round(winnerScore.stddevMinutes)} min
                  </span>
                </>
              )}
            </p>
          )}
          <p className="text-[11px] text-gray-500 dark:text-gray-450 leading-relaxed">
            Picked to minimise the longest commute across participants. Vote
            however you like — this is just a hint.
          </p>
        </div>
      </div>
    </div>
  );
}
