"use client";

import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { useState } from "react";
import { preferencesSchema } from "@/lib/schemas/preferences";

type EventPreferencesFormData = {
  name: string;
  useCurrentLocation: boolean;
  location: string;
  dietaryRequirements: string[];
  dietaryNotes: string;
  preferences: string;
  transportationMode: string;
};

export default function PreferencesForm({
  user,
}: {
  user?: { name?: string };
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventPreferencesFormData>({
    resolver: joiResolver(preferencesSchema),
    mode: "onBlur",
    defaultValues: {
      name: user?.name || "",
      useCurrentLocation: false,
      location: "",
      dietaryRequirements: [],
      dietaryNotes: "",
      preferences: "",
      transportationMode: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detectedSuburb, setDetectedSuburb] = useState<string>("");
  const useCurrentLocation = watch("useCurrentLocation");

  async function handleUseCurrentLocationChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const checked = e.target.checked;
    setValue("useCurrentLocation", checked);

    if (!checked) {
      setValue("location", "");
      setDetectedSuburb("");
      setLocationError(null);
      return;
    }

    // Attempt to get suburb from geolocation
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setValue("useCurrentLocation", false);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocode to get suburb
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
          const res = await fetch(
            `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${token}&country=au&types=locality,place`,
          );
          const json = await res.json();
          // Use properties.name for the suburb, then append state code + country
          // from the feature's context (e.g. "Kensington, NSW, Australia")
          const feature = json.features?.[0];
          const name = feature?.properties?.name || "";
          const city = feature?.properties?.context?.place?.name || "";
          const state = feature?.properties?.context?.region?.region_code || "";
          const country = feature?.properties?.context?.country?.name || "";

          // Uses truthy value check to prevent empty strings from being included
          const suburb = [name, city, state, country]
            .filter(Boolean)
            .join(", ");
          setValue("location", suburb);
          setDetectedSuburb(suburb);
        } catch {
          setLocationError(
            "Could not resolve your location. Please enter it manually.",
          );
          setValue("useCurrentLocation", false);
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationError(
          "Location access was denied. Please enter your suburb manually.",
        );
        setValue("useCurrentLocation", false);
        setLocationLoading(false);
      },
    );
  }

  async function onSubmit(data: EventPreferencesFormData) {
    setIsSubmitting(true);
    console.log(data);

    // Simulate API request
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-800 dark:bg-[#111]">
        {/* Heading */}
        <h2 className="mb-2 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Plans for today?
        </h2>

        <p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Customise your recommendations
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Your full name"
              {...register("name", { required: "Name is required" })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-700 dark:bg-[#181818] dark:text-white"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Use Current Location Checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="useCurrentLocation"
              {...register("useCurrentLocation")}
              onChange={handleUseCurrentLocationChange}
              className="h-4 w-4 accent-cyan-600"
              disabled={locationLoading}
            />
            <label
              htmlFor="useCurrentLocation"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Use current location
              {locationLoading && (
                <span className="ml-2 text-xs text-cyan-500 animate-pulse">
                  Detecting suburb...
                </span>
              )}
            </label>
          </div>
          {locationError && (
            <p className="text-sm text-red-500">{locationError}</p>
          )}

          {/* Location */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Location (Suburb)
              {!useCurrentLocation && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              placeholder={
                useCurrentLocation && detectedSuburb
                  ? detectedSuburb
                  : useCurrentLocation
                    ? "Detecting your suburb..."
                    : "e.g. Newcastle"
              }
              {...register("location")}
              readOnly={useCurrentLocation}
              className={`w-full rounded-lg border px-4 py-3 text-gray-900 outline-none transition duration-200 focus:ring-2 bg-white dark:bg-[#181818] dark:text-white ${
                useCurrentLocation
                  ? "cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-[#222] dark:text-gray-400"
                  : errors.location
                    ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                    : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 dark:border-gray-700"
              }`}
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-500">
                {errors.location.message}
              </p>
            )}
          </div>

          {/* Dietary Requirements */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Dietary Requirements
            </label>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-300 p-4 dark:border-gray-700">
              {[
                "Vegetarian",
                "Vegan",
                "Gluten Free",
                "Halal",
                "Kosher",
                "Nut Allergy",
              ].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-2 text-sm text-gray-700 transition-colors hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400"
                >
                  <input
                    type="checkbox"
                    value={item}
                    {...register("dietaryRequirements")}
                    className="h-4 w-4 accent-cyan-600"
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          {/* Additional Dietary Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional Dietary Notes
            </label>
            <textarea
              rows={3}
              placeholder="Any allergies or additional dietary notes..."
              {...register("dietaryNotes")}
              className={`w-full resize-none rounded-lg border px-4 py-3 text-gray-900 outline-none transition duration-200 focus:ring-2 bg-white dark:bg-[#181818] dark:text-white ${
                errors.dietaryNotes
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 dark:border-gray-700"
              }`}
            />
            {errors.dietaryNotes && (
              <p className="mt-1 text-sm text-red-500">
                {errors.dietaryNotes.message}
              </p>
            )}
          </div>

          {/* Preferences */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preferences
            </label>
            <textarea
              rows={4}
              placeholder="Any seating, accessibility, or event preferences..."
              {...register("preferences")}
              className={`w-full resize-none rounded-lg border px-4 py-3 text-gray-900 outline-none transition duration-200 focus:ring-2 bg-white dark:bg-[#181818] dark:text-white ${
                errors.preferences
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 dark:border-gray-700"
              }`}
            />
            {errors.preferences && (
              <p className="mt-1 text-sm text-red-500">
                {errors.preferences.message}
              </p>
            )}
          </div>

          {/* Transportation Mode */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Transportation Mode <span className="text-red-500">*</span>
            </label>
            <select
              {...register("transportationMode")}
              className={`w-full rounded-lg border px-4 py-3 text-gray-900 outline-none transition duration-200 focus:ring-2 bg-white dark:bg-[#181818] dark:text-white ${
                errors.transportationMode
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 dark:border-gray-700"
              }`}
            >
              <option value="">Select transportation mode</option>
              <option value="bus">Bus</option>
              <option value="train">Train</option>
              <option value="metro">Metro</option>
              <option value="driving">Driving</option>
              <option value="cycling">Cycling</option>
              <option value="walking">Walking</option>
            </select>
            {errors.transportationMode && (
              <p className="mt-1 text-sm text-red-500">
                {errors.transportationMode.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg bg-cyan-600 px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Submit Preferences"}
          </button>
        </form>
      </div>
    </div>
  );
}
