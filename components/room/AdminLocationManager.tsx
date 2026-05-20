"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Room } from "@/types/room";
import { Search, MapPin, Plus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  room: Room;
  onRoomUpdate: () => void;
}

interface MapboxSuggestion {
  mapbox_id: string;
  name: string;
  place_formatted: string;
}

interface SelectedLocationDetails {
  name: string;
  full_address: string;
  latitude: number;
  longitude: number;
}

export default function AdminLocationManager({ room, onRoomUpdate }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationDetails | null>(null);

  // Session Token for Mapbox Search Box API billing/grouping
  const sessionTokenRef = useRef("");
  const refreshSessionToken = useCallback(() => {
    sessionTokenRef.current = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }, []);

  useEffect(() => {
    refreshSessionToken();
  }, [refreshSessionToken]);

  // Confirmation Form State
  const [confirmedName, setConfirmedName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Updating location category state
  const [updatingLocationId, setUpdatingLocationId] = useState<string | null>(null);

  // Map state and ready flag
  const [mapReady, setMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Update map marker and center when selectedLocation changes
  useEffect(() => {
    if (!selectedLocation || !mapContainerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not found");
      return;
    }
    mapboxgl.accessToken = token;

    if (!mapRef.current) {
      setMapReady(false);
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [selectedLocation.longitude, selectedLocation.latitude],
        zoom: 14,
      });
      mapRef.current = map;

      const marker = new mapboxgl.Marker({ color: "#06b6d4" })
        .setLngLat([selectedLocation.longitude, selectedLocation.latitude])
        .addTo(map);
      markerRef.current = marker;

      map.on("load", () => {
        setMapReady(true);
      });
    } else {
      mapRef.current.flyTo({
        center: [selectedLocation.longitude, selectedLocation.latitude],
        zoom: 14,
        essential: true,
      });
      markerRef.current?.setLngLat([selectedLocation.longitude, selectedLocation.latitude]);
    }
  }, [selectedLocation]);

  // Clean up map when component unmounts
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Search input change handler with simple debounce/fetch
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    setIsSearching(true);
    try {
      const searchText = encodeURIComponent(query);
      const res = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/suggest?q=${searchText}&country=au&session_token=${sessionTokenRef.current}&access_token=${token}`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();

      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Retrieve details for a selected suggestion
  const handleSelectSuggestion = async (sug: MapboxSuggestion) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${sug.mapbox_id}?session_token=${sessionTokenRef.current}&access_token=${token}`
      );
      if (!res.ok) throw new Error("Retrieval failed");
      const data = await res.json();

      if (data.features && data.features.length > 0) {
        const feat = data.features[0];
        const details: SelectedLocationDetails = {
          name: feat.properties.name || sug.name,
          full_address: feat.properties.full_address || feat.properties.place_formatted || sug.place_formatted || "",
          latitude: feat.geometry.coordinates[1],
          longitude: feat.geometry.coordinates[0],
        };
        setSelectedLocation(details);
        setConfirmedName(details.name);
        setSuggestions([]);
        setSearchQuery(details.name);
        refreshSessionToken();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to retrieve location details.");
    } finally {
      setIsSearching(false);
    }
  };

  // Confirm adding location
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !confirmedName.trim()) return;

    setIsAdding(true);
    try {
      await api.post(`/rooms/${room.code}/locations`, {
        name: confirmedName.trim(),
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        description: selectedLocation.full_address,
        category: selectedCategory || undefined,
      });

      toast.success("Location added successfully!");
      // Reset search/state
      setSelectedLocation(null);
      setSearchQuery("");
      setSuggestions([]);
      setConfirmedName("");
      setSelectedCategory("");
      setMapReady(false);

      // Update room state
      onRoomUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add location.");
    } finally {
      setIsAdding(false);
    }
  };

  // Update an existing location's category
  const handleCategoryChange = async (locationId: string, categoryId: string) => {
    setUpdatingLocationId(locationId);
    try {
      await api.patch(`/rooms/${room.code}/locations`, {
        locationId,
        category: categoryId || undefined,
      });
      toast.success("Category updated!");
      onRoomUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update category.");
    } finally {
      setUpdatingLocationId(null);
    }
  };

  // Delete a location added by the admin
  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;
    setUpdatingLocationId(locationId);
    try {
      await api.delete(`/rooms/${room.code}/locations`, {
        params: { locationId },
      });
      toast.success("Location deleted successfully!");
      onRoomUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete location.");
    } finally {
      setUpdatingLocationId(null);
    }
  };

  const adminAddedLocations = room.locations.filter((loc) => loc.addedByAdmin);

  return (
    <div className="space-y-8 bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-6 shadow-xs backdrop-blur-md">
      <div>
        <h2 className="text-xl font-bold bg-linear-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
          Admin Location Panel
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Add custom recommendations for voting, geocoded using Mapbox.
        </p>
      </div>

      {/* Mapbox Geocoding Autocomplete Search */}
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Search Location
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type a location name or address (e.g. Opera Bar)..."
            className="block w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all placeholder-gray-400 dark:placeholder-gray-600"
          />

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800/85 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(sug)}
                  className="w-full text-left px-4 py-3 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 border-b border-gray-100 dark:border-gray-850 flex items-start gap-3 transition-colors last:border-b-0"
                >
                  <MapPin className="w-4 h-4 text-cyan-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {sug.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {sug.place_formatted}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Preview & Add Form */}
      {selectedLocation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-white dark:bg-[#111] border border-gray-200/80 dark:border-gray-800/60 shadow-lg shadow-gray-100/50 dark:shadow-none animate-in fade-in zoom-in-95 duration-200">
          {/* Map */}
          <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 min-h-[220px]">
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
              </div>
            )}
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
          </div>

          {/* Confirm details Form */}
          <form onSubmit={handleAddLocation} className="flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                Confirm Details
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Location Name
                </label>
                <input
                  type="text"
                  value={confirmedName}
                  onChange={(e) => setConfirmedName(e.target.value)}
                  className="block w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-[#0a0a0a] focus:ring-1 focus:ring-cyan-500 transition-all font-medium text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Assign Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-850 bg-white dark:bg-[#0a0a0a] focus:ring-1 focus:ring-cyan-500 text-gray-700 dark:text-gray-300"
                >
                  <option value="">No Category</option>
                  {room.categories?.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                <span className="font-semibold text-gray-700 dark:text-gray-300 block">Address:</span>
                <span className="block truncate max-w-sm">{selectedLocation.full_address}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding || !confirmedName.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add Location
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin added locations list */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
          <span>Your Added Locations ({adminAddedLocations.length})</span>
          {updatingLocationId && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-500" />}
        </h3>

        {adminAddedLocations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-250 dark:border-gray-800 p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            You haven't manually added any locations to this room yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {adminAddedLocations.map((loc) => (
              <div
                key={loc._id}
                className="p-4 rounded-xl bg-white dark:bg-[#111] border border-gray-200/80 dark:border-gray-850 hover:border-cyan-400/50 dark:hover:border-cyan-850 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {loc.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {loc.description || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Category:</span>
                  <select
                    value={loc.category || ""}
                    disabled={updatingLocationId === loc._id}
                    onChange={(e) => handleCategoryChange(loc._id!, e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#151515] text-xs font-semibold text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">None</option>
                    {room.categories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleDeleteLocation(loc._id!)}
                    disabled={updatingLocationId === loc._id}
                    title="Delete location"
                    className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
