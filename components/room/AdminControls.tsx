"use client";

import { useState, useEffect } from "react";
import type { Room, Category } from "@/types/room";
import { Zap, Loader2 } from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

interface Props {
  room: Room;
  onRoomUpdate: () => void;
}

export default function AdminControls({ room, onRoomUpdate }: Props) {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Use the categories selected for the room
  useEffect(() => {
    setAllCategories(room.categories);
    setSelectedCategories(room.categories.map((c) => c._id));
    setLoadingCategories(false);
  }, [room.categories]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleStart = async () => {
    if (selectedCategories.length === 0) return;
    setIsStarting(true);
    try {
      if (!room.locations || room.locations.length === 0) {
        toast.loading("No locations found. Auto-generating venues...", { id: "generateToast" });
        await api.post(`/rooms/${room.code}/generate-locations`, {
          travelBudgetMinutes: room.travelBudgetMinutes ?? 20,
        });
        toast.dismiss("generateToast");
        toast.success("Locations auto-generated!");
      }
      await api.put(`/rooms/${room.code}/status/voting`);
      toast.success("Voting has started!");
      onRoomUpdate();
    } catch (err: any) {
      toast.dismiss("generateToast");
      toast.error(err.response?.data?.message || "Failed to start voting.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <section className="rounded-xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-950/20 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Start Voting
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select one or more categories, then generate location suggestions.
        </p>
      </div>

      {/* Category pills */}
      {loadingCategories ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading categories...</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => {
            const active = selectedCategories.includes(cat._id);
            return (
              <button
                key={cat._id}
                onClick={() => toggleCategory(cat._id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? "bg-cyan-600 border-cyan-700 text-white"
                    : "bg-white dark:bg-[#111] border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-cyan-400 dark:hover:border-cyan-600"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={selectedCategories.length === 0 || isStarting}
        className="btn btn-submit flex items-center gap-2"
      >
        <Zap className="w-4 h-4" />
        {isStarting ? (
          (!room.locations || room.locations.length === 0) ? "Generating Locations..." : "Starting..."
        ) : (
          (!room.locations || room.locations.length === 0) ? "Generate & Start Voting" : "Start Voting"
        )}
      </button>
    </section>
  );
}