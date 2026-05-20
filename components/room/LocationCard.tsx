// components/room/LocationCard.tsx
import { GripVertical, ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
import type { Location, Category } from "@/types/room";

interface Props {
  location: Location;
  rank: number;
  category?: Category;
  isDragging: boolean;
  isHovered: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onViewMap?: () => void;
  routeDetails?: { distance: number; duration: number } | null;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function LocationCard({
  location,
  rank,
  category,
  isDragging,
  isHovered,
  onDragStart,
  onDragOver,
  onDrop,
  onViewMap,
  routeDetails,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}: Props) {
  // Builds a link to view the location on OpenStreetMap
  const mapUrl = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}&zoom=15`;

  const handleClick = (e: React.MouseEvent) => {
    if (onViewMap) {
      e.preventDefault();
      e.stopPropagation();
      onViewMap();
    }
  };

  // Helper to format distance and duration
  const getDistanceString = () => {
    if (!routeDetails) return null;
    const km = routeDetails.distance / 1000;
    const mins = Math.round(routeDetails.duration / 60);
    return `${km.toFixed(1)} km (${mins} mins)`;
  };
  
  const distanceStr = getDistanceString();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDrop={onDrop}
      className={`flex items-center gap-4 rounded-xl border bg-white dark:bg-[#111] px-4 py-3 transition-all cursor-grab active:cursor-grabbing
        ${isDragging
          ? "opacity-30 border-cyan-400 dark:border-cyan-600 scale-95"  // faded while being dragged
          : isHovered
            ? "opacity-50 border-cyan-300 dark:border-cyan-700 scale-95"
            : "border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700"
        }`}
    >
      {/* Drag handle & Mobile Reorder buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <GripVertical className="hidden sm:block w-5 h-5 text-gray-300 dark:text-gray-600 cursor-grab" />
        <div className="flex flex-col gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onMoveUp) onMoveUp();
            }}
            disabled={isFirst}
            className={`p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              isFirst ? "text-gray-200 dark:text-gray-800 cursor-not-allowed" : "text-gray-400 dark:text-cyan-500 cursor-pointer"
            }`}
            title="Move Up"
            type="button"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onMoveDown) onMoveDown();
            }}
            disabled={isLast}
            className={`p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              isLast ? "text-gray-200 dark:text-gray-800 cursor-not-allowed" : "text-gray-400 dark:text-cyan-500 cursor-pointer"
            }`}
            title="Move Down"
            type="button"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rank badge */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-600 text-white text-sm font-bold flex items-center justify-center">
        {rank}
      </div>

      {/* Location details */}
      <div
        onClick={handleClick}
        className="flex-1 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
      >
        {/* Name */}
        <p className="font-semibold text-gray-900 dark:text-white truncate">
          {location.name}
        </p>

        {/* Address */}
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {location.description}
        </p>

        {/* Category name & Distance */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {category && (
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
              {category.name}
            </span>
          )}
          {distanceStr && (
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
              {distanceStr}
            </span>
          )}
        </div>
      </div>

      {/* Map link */}
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex-shrink-0 flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
        aria-label={`View ${location.name} on map`}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">View map</span>
      </a>
    </div>
  );
}