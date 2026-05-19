// components/room/LocationCard.tsx
import { GripVertical, ExternalLink } from "lucide-react";
import type { Location, Category } from "@/types/room";

interface Props {
  location: Location;
  rank: number;              
  category?: Category;     
  isDragging: boolean;      
  onDragStart: () => void;   
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}

export default function LocationCard({
  location,
  rank,
  category,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
}: Props) {
  // Builds a link to view the location on OpenStreetMap
  // No API key needed - flag with team to switch to Mapbox ltr
  const mapUrl = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}&zoom=15`;

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
          ? "opacity-40 border-cyan-400 dark:border-cyan-600 scale-95"  // faded while being dragged
          : "border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700"
        }`}
    >
      {/* Drag handle icon */}
      <GripVertical className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />

      {/* Rank badge */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-600 text-white text-sm font-bold flex items-center justify-center">
        {rank}
      </div>

      {/* Location details */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <p className="font-semibold text-gray-900 dark:text-white truncate">
          {location.name}
        </p>

        {/* Address */}
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {location.description}
        </p>

        {/* Category name */}
        {category && (
          <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
            {category.name}
          </span>
        )}
      </div>

      {/* Map link — opens in new tab */}
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"            
        onClick={(e) => e.stopPropagation()} 
        className="flex-shrink-0 flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
        aria-label={`View ${location.name} on map`}
      >
        <ExternalLink className="w-3 h-3" />
        <span className="hidden sm:inline">View map</span>
      </a>
    </div>
  );
}