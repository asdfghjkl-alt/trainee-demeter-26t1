"use client";

import type { Participant } from "@/types/room";
import { Utensils, NotebookPen, Sparkles } from "lucide-react";

interface Props {
  participants: Participant[];
}

const DIETARY_TAGS = [
  "Vegetarian",
  "Vegan",
  "Gluten Free",
  "Halal",
  "Kosher",
  "Nut Allergy",
] as const;

type FreeformEntry = { text: string; count: number };

function aggregateFreeform(values: (string | undefined)[]): FreeformEntry[] {
  const map = new Map<string, number>();
  for (const raw of values) {
    const text = raw?.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    const existing = map.get(key);
    if (existing !== undefined) {
      map.set(key, existing + 1);
    } else {
      map.set(key, 1);
      // Preserve original casing by storing under the lowercase key but
      // re-emitting the first-seen text; we track that separately below.
    }
  }
  // Rebuild with first-seen casing
  const firstSeen = new Map<string, string>();
  for (const raw of values) {
    const text = raw?.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (!firstSeen.has(key)) firstSeen.set(key, text);
  }
  return Array.from(map.entries()).map(([key, count]) => ({
    text: firstSeen.get(key) ?? key,
    count,
  }));
}

export default function DietarySummary({ participants }: Props) {
  const tagCounts: Record<string, number> = Object.fromEntries(
    DIETARY_TAGS.map((tag) => [tag, 0]),
  );
  for (const p of participants) {
    for (const tag of p.dietaryRequirements ?? []) {
      if (tag in tagCounts) tagCounts[tag] += 1;
    }
  }

  const notes = aggregateFreeform(participants.map((p) => p.dietaryNotes));
  const prefs = aggregateFreeform(participants.map((p) => p.preferences));

  const anyTagSet = Object.values(tagCounts).some((c) => c > 0);

  return (
    <section className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/10 p-6 shadow-xs backdrop-blur-md space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-[#0092b8]">
          Dietary Summary
        </h2>
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-900/50">
          Admin only
        </span>
      </div>

      {/* Dietary tag counts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          <Utensils className="w-3.5 h-3.5" />
          <span>Dietary Requirements</span>
        </div>
        {anyTagSet ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DIETARY_TAGS.map((tag) => {
              const count = tagCounts[tag];
              const active = count > 0;
              return (
                <div
                  key={tag}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-white dark:bg-[#111] border-cyan-200 dark:border-cyan-900/60 text-gray-900 dark:text-gray-100"
                      : "bg-transparent border-gray-200/70 dark:border-gray-800/70 text-gray-400 dark:text-gray-600"
                  }`}
                >
                  <span className="font-medium">{tag}</span>
                  <span
                    className={`tabular-nums font-bold ${
                      active
                        ? "text-cyan-600 dark:text-cyan-400"
                        : "text-gray-300 dark:text-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            No dietary requirements reported.
          </p>
        )}
      </div>

      {/* Additional notes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          <NotebookPen className="w-3.5 h-3.5" />
          <span>Additional Dietary Notes</span>
        </div>
        {notes.length > 0 ? (
          <ul className="space-y-1.5">
            {notes.map((entry) => (
              <li
                key={entry.text}
                className="flex items-start justify-between gap-3 rounded-lg bg-white dark:bg-[#111] border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
              >
                <span className="whitespace-pre-wrap break-words">{entry.text}</span>
                {entry.count > 1 && (
                  <span className="shrink-0 rounded-full bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-900/50">
                    ×{entry.count}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            No notes reported.
          </p>
        )}
      </div>

      {/* Preferences */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Preferences</span>
        </div>
        {prefs.length > 0 ? (
          <ul className="space-y-1.5">
            {prefs.map((entry) => (
              <li
                key={entry.text}
                className="flex items-start justify-between gap-3 rounded-lg bg-white dark:bg-[#111] border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
              >
                <span className="whitespace-pre-wrap break-words">{entry.text}</span>
                {entry.count > 1 && (
                  <span className="shrink-0 rounded-full bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-900/50">
                    ×{entry.count}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            No preferences reported.
          </p>
        )}
      </div>
    </section>
  );
}
