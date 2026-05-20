"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import InputField from "@/components/ui/inputs/InputField";
import { useState, useEffect } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { TRANSPORTATION_MODES } from "@/lib/constants";

type CreateRoomFormData = {
  name: string;
  date: string;
  meetingDirection: "to-venue" | "from-venue";
  description: string;
  location: string;
  transportationMode: string;
  useCurrentLocation: boolean;
  dietaryRequirements: string[];
  dietaryNotes: string;
  preferences: string;
};

export default function CreateRoomForm({
  user,
  initialCategories = [],
}: {
  user?: any;
  initialCategories?: { _id: string; name: string }[];
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateRoomFormData>({
    defaultValues: {
      name: "",
      date: "",
      meetingDirection: "to-venue",
      description: "",
      location: "",
      transportationMode: "",
      useCurrentLocation: false,
      dietaryRequirements: [],
      dietaryNotes: "",
      preferences: "",
    },
  });

  const descriptionValue = useWatch({ control, name: "description" }) ?? "";
  const DESCRIPTION_MAX = 200;

  const [isCreating, setIsCreating] = useState(false);
  const [categories, setCategories] =
    useState<{ _id: string; name: string }[]>(initialCategories);
  const [serverError, setServerError] = useState<string | null>(null);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const handleAddCategory = (categoryId: string) => {
    if (!categoryId) return;
    if (selectedCategoryIds.includes(categoryId)) return;
    if (selectedCategoryIds.length >= 3) {
      toast.error("You can select up to 3 categories");
      return;
    }
    setSelectedCategoryIds((prev) => [...prev, categoryId]);
    setCategoryError(null);
  };

  const handleRemoveCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
  };

  const availableCategories = categories.filter(
    (cat) => !selectedCategoryIds.includes(cat._id),
  );

  // Geolocation States
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detectedSuburb, setDetectedSuburb] = useState<string>("");
  const useCurrentLocation = watch("useCurrentLocation");
  const meetingDirection = watch("meetingDirection");

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
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
          const res = await fetch(
            `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${token}&country=au&types=locality,place`,
          );
          const json = await res.json();
          const feature = json.features?.[0];
          const name = feature?.properties?.name || "";
          const city = feature?.properties?.context?.place?.name || "";
          const state = feature?.properties?.context?.region?.region_code || "";
          const country = feature?.properties?.context?.country?.name || "";

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
          "Location access was denied. Please enter your location manually.",
        );
        setValue("useCurrentLocation", false);
        setLocationLoading(false);
      },
    );
  }

  useEffect(() => {
    if (categories.length > 0) return;
    async function loadCategories() {
      try {
        const res = await api.get("/categories");
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
  }, [categories.length]);

  async function onSubmit(data: CreateRoomFormData) {
    setIsCreating(false);
    setServerError(null);

    let hasError = false;
    if (!data.name || data.name.trim().length < 3) {
      setError("name", {
        type: "manual",
        message: "Room name must be at least 3 characters long",
      });
      hasError = true;
    }
    if (selectedCategoryIds.length === 0) {
      setCategoryError("Please select at least one category");
      hasError = true;
    } else if (selectedCategoryIds.length > 3) {
      setCategoryError("You can select up to 3 categories");
      hasError = true;
    }
    if (!data.location || data.location.trim().length < 2) {
      setError("location", {
        type: "manual",
        message: "Starting location must be at least 2 characters long",
      });
      hasError = true;
    }
    if (!data.transportationMode) {
      setError("transportationMode", {
        type: "manual",
        message: "Please select a transportation mode",
      });
      hasError = true;
    }

    if (hasError) return;

    setIsCreating(true);
    try {
      const payload = {
        name: data.name.trim(),
        categoryIds: selectedCategoryIds,
        location: data.location.trim(),
        transportationMode: data.transportationMode,
        date: data.date ? new Date(data.date).toISOString() : undefined,
        meetingDirection: data.meetingDirection,
        description: data.description.trim() || undefined,
        dietaryRequirements: data.dietaryRequirements,
        dietaryNotes: data.dietaryNotes,
        preferences: data.preferences,
      };

      const res = await api.post("/rooms", payload);
      const code = res.data.room.code;
      toast.success(res.data.message || "Room successfully created!");

      // On successful creation, redirect to /rooms/code
      router.push(`/rooms/${code}`);
    } catch (error: any) {
      console.error(error);
      setServerError(
        error.response?.data?.message ||
        "Failed to create room. Please try again.",
      );
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
      {/* HEADER */}
      <h1 className="mt-10 mb-2 text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
        Create Your Meetup
        {user?.fname ? `, ${user.fname}` : ""}
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl">
        Take charge of your meetup and choose a place where meaningful
        connections happen. Create a room and invite your friends.
      </p>

      {/* FORM (full width) */}
      <div className="mt-10 w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100/70 dark:bg-gray-900/40 p-6 shadow-sm backdrop-blur-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <InputField
            label="Meeting Name"
            name="name"
            placeholder="e.g. DevSoc Hangout"
            register={register}
            error={errors.name}
          />

          {/* Date + Category side-by-side on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <InputField
                label="Meeting Date & Time"
                name="date"
                type="datetime-local"
                placeholder=""
                register={register}
                error={errors.date}
              />
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    today.setHours(12, 0, 0, 0);
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, "0");
                    const day = String(today.getDate()).padStart(2, "0");
                    const hours = String(today.getHours()).padStart(2, "0");
                    const minutes = String(today.getMinutes()).padStart(2, "0");
                    setValue("date", `${year}-${month}-${day}T${hours}:${minutes}`);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-150 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Today (Noon)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, "0");
                    const day = String(now.getDate()).padStart(2, "0");
                    const hours = String(now.getHours()).padStart(2, "0");
                    const minutes = String(now.getMinutes()).padStart(2, "0");
                    setValue("date", `${year}-${month}-${day}T${hours}:${minutes}`);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30 transition-colors cursor-pointer"
                >
                  Current Time (Now)
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="category"
                className="my-2 block font-medium text-gray-900 dark:text-white"
              >
                Categories (Select up to 3)
              </label>

              {/* Selected Categories List */}
              {selectedCategoryIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedCategoryIds.map((id) => {
                    const cat = categories.find((c) => c._id === id);
                    if (!cat) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-linear-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-400/20 dark:to-blue-400/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-400/30 transition-all duration-200 hover:scale-105"
                      >
                        {cat.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(id)}
                          className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200 transition-colors focus:outline-none"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <select
                  id="category"
                  disabled={selectedCategoryIds.length >= 3}
                  onChange={(e) => {
                    handleAddCategory(e.target.value);
                    e.target.value = "";
                  }}
                  value=""
                  className="w-full appearance-none rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-3 pr-12 text-base text-gray-900 dark:text-gray-100 transition-colors focus:border-cyan-500 dark:focus:border-cyan-500 focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:border-gray-200 dark:disabled:border-gray-800"
                >
                  <option value="">
                    {selectedCategoryIds.length >= 3
                      ? "Maximum 3 categories selected"
                      : "Add category..."}
                  </option>
                  {availableCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {categoryError && (
                <p className="mt-1 text-sm text-red-500">{categoryError}</p>
              )}
            </div>
          </div>

          {/* Travel Direction */}
          <div>
            <label className="my-2 block font-medium text-gray-900 dark:text-white">
              Travel Direction
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 bg-white dark:bg-[#0a0a0a] ${meetingDirection === "to-venue"
                    ? "border-cyan-500 shadow-sm shadow-cyan-500/10 dark:shadow-cyan-500/5"
                    : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                  }`}
              >
                <input
                  type="radio"
                  value="to-venue"
                  {...register("meetingDirection")}
                  className="sr-only"
                />
                <span className="font-semibold text-gray-900 dark:text-white text-base">
                  Commute to Venue
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Participants travel from their starting location to meet at the venue. Timetables and routes are calculated for arrival at the venue.
                </span>
              </label>

              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 bg-white dark:bg-[#0a0a0a] ${meetingDirection === "from-venue"
                    ? "border-cyan-500 shadow-sm shadow-cyan-500/10 dark:shadow-cyan-500/5"
                    : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                  }`}
              >
                <input
                  type="radio"
                  value="from-venue"
                  {...register("meetingDirection")}
                  className="sr-only"
                />
                <span className="font-semibold text-gray-900 dark:text-white text-base">
                  Travel Home from Venue
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Participants meet at the venue and then travel back to their starting location. Timetables and routes are calculated for departure from the venue.
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="description"
                  className="font-medium text-gray-900 dark:text-white"
                >
                  Description
                </label>
                <span className="rounded-full bg-gray-300/70 dark:bg-gray-700/70 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Optional
                </span>
              </div>
              <span
                className={`text-xs tabular-nums ${descriptionValue.length > DESCRIPTION_MAX
                    ? "text-red-500"
                    : "text-gray-500 dark:text-gray-400"
                  }`}
              >
                {descriptionValue.length}/{DESCRIPTION_MAX}
              </span>
            </div>

            <textarea
              id="description"
              rows={4}
              placeholder="Tell your friends what this meetup is about - plans, etc."
              maxLength={DESCRIPTION_MAX}
              {...register("description", {
                maxLength: {
                  value: DESCRIPTION_MAX,
                  message: `Keep it under ${DESCRIPTION_MAX} characters.`,
                },
              })}
              className="w-full resize-none rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors focus:border-cyan-500 focus:outline-none"
            />

            {errors.description && (
              <p className="mt-1 text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Travel details section */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-5 mt-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {meetingDirection === "from-venue"
                ? "Your Return Details (As First Participant)"
                : "Your Travel Details (As First Participant)"}
            </h3>

            {/* Use Current Location Checkbox */}
            <div className="flex items-center gap-3 mb-4">
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
                className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <span>Use current location</span>
                {locationLoading && (
                  <span className="text-xs text-cyan-500 animate-pulse">
                    Detecting suburb...
                  </span>
                )}
              </label>
            </div>
            {locationError && (
              <p className="text-sm text-red-500 mb-4">{locationError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label={meetingDirection === "from-venue" ? "Home Suburb / End Destination" : "Starting Location"}
                name="location"
                placeholder={
                  useCurrentLocation && detectedSuburb
                    ? detectedSuburb
                    : useCurrentLocation
                      ? (meetingDirection === "from-venue" ? "Detecting your return location..." : "Detecting your starting location...")
                      : "e.g. Kensington"
                }
                register={register}
                error={errors.location}
                readOnly={useCurrentLocation}
              />

              <div>
                <label
                  htmlFor="transportationMode"
                  className="my-2 block font-medium text-gray-900 dark:text-white"
                >
                  Transportation Mode
                </label>
                <div className="relative">
                  <select
                    id="transportationMode"
                    {...register("transportationMode")}
                    className="w-full appearance-none rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-3 pr-12 text-base text-gray-900 dark:text-gray-100 transition-colors focus:border-cyan-500 dark:focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Select mode</option>
                    {TRANSPORTATION_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                {errors.transportationMode && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.transportationMode.message}
                  </p>
                )}
              </div>
            </div>

            {/* Dietary Requirements */}
            <div className="mt-5">
              <label className="my-2 block font-medium text-gray-900 dark:text-white">
                Your Dietary Requirements
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
            <div className="mt-4">
              <label className="my-2 block font-medium text-gray-900 dark:text-white">
                Additional Dietary Notes
              </label>
              <textarea
                rows={3}
                placeholder="Any allergies or additional dietary notes..."
                {...register("dietaryNotes")}
                className="w-full resize-none rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-4 text-base text-gray-900 dark:text-gray-100 outline-none transition duration-200 focus:border-cyan-500 dark:focus:border-cyan-500"
              />
            </div>

            {/* Preferences */}
            <div className="mt-4">
              <label className="my-2 block font-medium text-gray-900 dark:text-white">
                Preferences
              </label>
              <textarea
                rows={3}
                placeholder="Any seating, accessibility, or event preferences..."
                {...register("preferences")}
                className="w-full resize-none rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-4 text-base text-gray-900 dark:text-gray-100 outline-none transition duration-200 focus:border-cyan-500 dark:focus:border-cyan-500"
              />
            </div>
          </div>

          {serverError && (
            <p className="text-sm font-medium text-red-500 mt-2 text-center">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-base font-medium text-white shadow-sm transition hover:bg-cyan-500 disabled:opacity-70"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
