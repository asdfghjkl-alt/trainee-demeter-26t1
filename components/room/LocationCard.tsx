// components/room/LocationCard.tsx
import { GripVertical, ExternalLink, ChevronUp, ChevronDown, Search } from "lucide-react";
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
  isTransit?: boolean;
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
  isTransit = false,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}: Props) {
  // Builds a link to view the location on OpenStreetMap
  const mapUrl = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}&zoom=15`;

  // Google search for the place (name + address) so voters can check reviews/photos/hours
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    [location.name, location.description].filter(Boolean).join(" "),
  )}`;

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
    return `${km.toFixed(1)} km ${isTransit ? "walk " : ""}(${mins} mins)`;
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
            className={`p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isFirst ? "text-gray-200 dark:text-gray-800 cursor-not-allowed" : "text-gray-400 dark:text-cyan-500 cursor-pointer"
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
            className={`p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isLast ? "text-gray-200 dark:text-gray-800 cursor-not-allowed" : "text-gray-400 dark:text-cyan-500 cursor-pointer"
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

      {/* Links: Map (in-app focus) + Google search (external) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="group inline-flex items-center justify-center gap-1.5 rounded-full border border-cyan-200 dark:border-cyan-900/50 bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300 transition-all hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:border-cyan-300 dark:hover:border-cyan-800 hover:shadow-sm active:scale-95"
          aria-label={`View ${location.name} on map`}
          title="Focus on map"
        >
          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-px" />
          <span className="hidden sm:inline">Map</span>
        </a>
        <a
          href={googleSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="group inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-cyan-300 dark:hover:border-cyan-800 hover:text-cyan-700 dark:hover:text-cyan-300 hover:shadow-sm active:scale-95"
          aria-label={`Search for ${location.name} on Google`}
          title="Look up on Google"
        >
          <Search className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Google</span>
        </a>
      </div>
    </div>
  );
}