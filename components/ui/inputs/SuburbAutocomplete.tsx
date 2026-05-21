"use client";

import { useState, useEffect, useRef } from "react";

interface SuburbAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: { message?: string };
  placeholder: string;
  readOnly?: boolean;
  required?: boolean;
  disabled?: boolean;
}

interface MapboxFeature {
  id: string;
  properties: {
    name: string;
    full_address?: string;
    place_formatted?: string;
    context?: {
      postcode?: {
        name?: string;
      };
      region?: {
        name?: string;
        region_code?: string;
      };
      place?: {
        name?: string;
      };
    };
  };
}

export default function SuburbAutocomplete({
  label,
  value,
  onChange,
  error,
  placeholder,
  readOnly = false,
  required = false,
  disabled = false,
}: SuburbAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [prevValue, setPrevValue] = useState(value);

  // Sync with value from parent (e.g. if geolocated or set externally)
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value || "");
  }

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch suggestions with debounce
  const fetchSuggestions = (searchText: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchText.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const encodedText = encodeURIComponent(searchText);
        const res = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodedText}&country=au&types=locality,place&limit=10&proximity=ip&access_token=${token}`
        );

        if (!res.ok) throw new Error("Failed to fetch suggestions");

        const data = await res.json();
        console.log(data.features)
        if (data.features) {
          setSuggestions(data.features);
          console.log(data.features)
          setIsOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Autocomplete fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    onChange(newVal); // update parent state on keystroke
    fetchSuggestions(newVal);
  };

  const handleSelectSuggestion = (feature: MapboxFeature) => {
    // full_address includes suburb + state + postcode + country (e.g. "Kensington, New South Wales 2033, Australia")
    const cleanSuburb = feature.properties.full_address || feature.properties.place_formatted || feature.properties.name;

    setQuery(cleanSuburb);
    onChange(cleanSuburb);
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <label
        className="my-2 block font-medium text-gray-900 dark:text-white"
        htmlFor="suburb-search-input"
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      <div className="relative">
        <input
          id="suburb-search-input"
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled || readOnly}
          readOnly={readOnly}
          className={`w-full rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 pr-10 text-base transition-colors focus:border-cyan-500 dark:focus:border-cyan-500 outline-none ${readOnly
            ? "bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            : "bg-white dark:bg-[#0a0a0a]"
            }`}
          autoComplete="off"
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5 text-cyan-600 dark:text-cyan-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] py-1 shadow-lg backdrop-blur-md">
          {suggestions.map((sug) => {
            const fullAddress = sug.properties.full_address || sug.properties.place_formatted || sug.properties.name;
            return (
              <button
                key={sug.id}
                type="button"
                onClick={() => handleSelectSuggestion(sug)}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800/60 focus:bg-gray-100 dark:focus:bg-gray-800/60 focus:outline-none transition-colors border-none bg-transparent cursor-pointer"
              >
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{sug.properties.name}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{fullAddress}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-500">
          {error.message}
        </p>
      )}
    </div>
  );
}
