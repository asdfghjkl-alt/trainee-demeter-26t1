"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";

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
  const { register, handleSubmit, watch, formState: { errors }} = useForm<EventPreferencesFormData>({
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
  const useCurrentLocation = watch("useCurrentLocation");

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
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >

          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>

            <input
              type="text"
              placeholder="Your full name"
              {...register("name", { required: "Name is required",})}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-700 dark:bg-[#181818] dark:text-white"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="useCurrentLocation"
              {...register("useCurrentLocation")}
              className="h-4 w-4 accent-cyan-600"
            />

            <label
              htmlFor="useCurrentLocation"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Use current location
            </label>
          </div>

          {/* Location */}
          {!useCurrentLocation && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Location (Suburb)
              </label>

              <input
                type="text"
                placeholder="e.g. Newcastle"
                {...register("location", {
                  required: !useCurrentLocation
                    ? "Location is required"
                    : false,
                })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-700 dark:bg-[#181818] dark:text-white"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.location.message}
                </p>
              )}
            </div>
          )}

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
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-700 dark:bg-[#181818] dark:text-white"
            />
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
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-700 dark:bg-[#181818] dark:text-white"
            />
          </div>

          {/* Transportation Mode */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Transportation Mode
            </label>

            <select
              {...register("transportationMode")}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-700 dark:bg-[#181818] dark:text-white"
            >
              <option value="">
                Select transportation mode
              </option>

              <option value="driving">
                Driving
              </option>

              <option value="transit">
                Transit
              </option>

              <option value="walking">
                Walking
              </option>

              <option value="cycling">
                Cycling
              </option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg bg-cyan-600 px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? "Submitting..."
              : "Submit Preferences"}
          </button>

        </form>
      </div>
    </div>
  );
}