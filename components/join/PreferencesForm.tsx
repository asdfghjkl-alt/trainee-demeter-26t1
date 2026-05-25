"use client";

import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SuburbAutocomplete from "@/components/ui/inputs/SuburbAutocomplete";
import { preferencesSchema } from "@/lib/schemas/preferences";
import api from "@/lib/axios";
import { TRANSPORTATION_MODES } from "@/lib/constants";

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
  code,
  user,
  meetingDirection = "to-venue",
  country = "au",
}: {
  code: string;
  user?: { name?: string };
  meetingDirection?: "to-venue" | "from-venue";
  country?: string;
}) {
  const router = useRouter();
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

  useEffect(() => {
    register("location");
  }, [register]);

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
          const countryParam = country && country !== "global" ? `&country=${country}` : "";
          const res = await fetch(
            `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${token}${countryParam}&types=locality,place`,
          );
          const json = await res.json();
          // Use properties.name for the suburb, then append state code + country
          // from the feature's context (e.g. "Kensington, NSW, Australia")
          const feature = json.features?.[0];
          const name = feature?.properties?.name || "";
          const city = feature?.properties?.context?.place?.name || "";
          const state = feature?.properties?.context?.region?.region_code || "";
          const detectedCountry = feature?.properties?.context?.country?.name || "";

          // Uses truthy value check to prevent empty strings from being included
          const suburb = [name, city, state, detectedCountry]
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

  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onSubmit(data: EventPreferencesFormData) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      console.log({
        name: data.name,
        location: data.location,
        dietaryRequirements: data.dietaryRequirements,
        dietaryNotes: data.dietaryNotes,
        preferences: data.preferences,
        transportationMode: data.transportationMode,
      });
      await api.post(`/rooms/${code}/join`, {
        name: data.name,
        location: data.location,
        dietaryRequirements: data.dietaryRequirements,
        dietaryNotes: data.dietaryNotes,
        preferences: data.preferences,
        transportationMode: data.transportationMode,
      });
      // Redirect to the room lobby on success
      router.push(`/rooms/${code}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
      {/* HEADER */}
      <h1 className="mt-10 mb-2 text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
        Plans for today?
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl">
        Customise your meetup preferences and travel details to get the most balanced recommendations.
      </p>

      {/* FORM (full width card) */}
      <div className="mt-10 w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100/70 dark:bg-gray-900/40 p-6 shadow-sm backdrop-blur-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div>
            <label className="my-2 block font-medium text-gray-900 dark:text-white" htmlFor="name">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your full name"
              {...register("name", { required: "Name is required" })}
              className="w-full rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 text-base transition-colors focus:border-cyan-500 dark:focus:border-cyan-500 outline-none bg-white dark:bg-[#0a0a0a]"
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
              className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 dark:border-gray-700 bg-white dark:bg-[#0a0a0a]"
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

            <SuburbAutocomplete
              label={meetingDirection === "from-venue" ? "Home Suburb / End Destination" : "Starting Location / Suburb"}
              value={watch("location")}
              onChange={(val) => setValue("location", val, { shouldValidate: true })}
              error={errors.location}
              placeholder={
                useCurrentLocation && detectedSuburb
                  ? detectedSuburb
                  : useCurrentLocation
                    ? (meetingDirection === "from-venue" ? "Detecting your return location..." : "Detecting your suburb...")
                    : "e.g. Newcastle"
              }
              readOnly={useCurrentLocation}
              required={!useCurrentLocation}
              country={country}
            />

          {/* Dietary Requirements */}
          <div>
            <label className="my-2 block font-medium text-gray-900 dark:text-white">
              Dietary Requirements
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-4">
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
                  className="flex items-center gap-2.5 text-sm text-gray-700 transition-colors hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={item}
                    {...register("dietaryRequirements")}
                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 dark:border-gray-700 bg-white dark:bg-[#0a0a0a]"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Dietary Notes */}
          <div>
            <label className="my-2 block font-medium text-gray-900 dark:text-white">
              Additional Dietary Notes
            </label>
            <textarea
              rows={3}
              placeholder="Any allergies or additional dietary notes..."
              {...register("dietaryNotes")}
              className="w-full resize-none rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-4 text-base text-gray-900 dark:text-gray-100 outline-none transition duration-200 focus:border-cyan-500 dark:focus:border-cyan-500"
            />
            {errors.dietaryNotes && (
              <p className="mt-1 text-sm text-red-500">
                {errors.dietaryNotes.message}
              </p>
            )}
          </div>

          {/* Preferences */}
          <div>
            <label className="my-2 block font-medium text-gray-900 dark:text-white">
              Preferences
            </label>
            <textarea
              rows={3}
              placeholder="Any seating, accessibility, or event preferences..."
              {...register("preferences")}
              className="w-full resize-none rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-4 text-base text-gray-900 dark:text-gray-100 outline-none transition duration-200 focus:border-cyan-500 dark:focus:border-cyan-500"
            />
            {errors.preferences && (
              <p className="mt-1 text-sm text-red-500">
                {errors.preferences.message}
              </p>
            )}
          </div>

          {/* Transportation Mode */}
          <div>
            <label className="my-2 block font-medium text-gray-900 dark:text-white">
              Transportation Mode <span className="text-red-500">*</span>
            </label>
            <select
              {...register("transportationMode")}
              className="w-full rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 text-base transition-colors focus:border-cyan-500 dark:focus:border-cyan-500 outline-none bg-white dark:bg-[#0a0a0a]"
            >
              <option value="">Select transportation mode</option>
              {TRANSPORTATION_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </option>
              ))}
            </select>
            {errors.transportationMode && (
              <p className="mt-1 text-sm text-red-500">
                {errors.transportationMode.message}
              </p>
            )}
          </div>

          {/* Server error */}
          {submitError && (
            <p className="text-sm font-medium text-red-500 mt-2 text-center">
              {submitError}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-base font-medium text-white shadow-sm transition hover:bg-cyan-500 disabled:opacity-70 mt-4"
          >
            {isSubmitting ? "Submitting..." : "Submit Preferences"}
          </button>
        </form>
      </div>
    </div>
  );
}
