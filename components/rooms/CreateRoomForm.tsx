"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import InputField from "@/components/ui/inputs/InputField";
import { useState } from "react";
import Link from "next/link";

type CreateRoomFormData = {
  meetingName: string;
  category: string;
  date: string;
  description: string;
};

function generateFakeCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function CreateRoomForm({ user }: any) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateRoomFormData>();

  const descriptionValue = useWatch({ control, name: "description" }) ?? "";
  const DESCRIPTION_MAX = 200;

  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  async function onSubmit(data: CreateRoomFormData) {
    setIsCreating(true);
    console.log("Fake room data:", data);
    setTimeout(() => {
      const code = generateFakeCode();
      setRoomCode(code);
      setIsCreating(false);
    }, 800);
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
            name="meetingName"
            placeholder="e.g. DevSoc Hangout"
            register={register}
            error={errors.meetingName}
          />

          {/* Date + Category side-by-side on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Date"
              name="date"
              type="date"
              placeholder=""
              register={register}
              error={errors.date}
            />

            <div>
              <label
                htmlFor="category"
                className="mb-2 block font-medium text-gray-900 dark:text-white"
              >
                Category
              </label>

              <div className="relative">
                <select
                  id="category"
                  {...register("category")}
                  className="w-full appearance-none rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-3 pr-12 text-base text-gray-900 dark:text-gray-100 transition-colors focus:border-cyan-500 dark:focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Select category</option>
                  <option value="food">Food</option>
                  <option value="study">Study</option>
                  <option value="sports">Sports</option>
                  <option value="nightlife">Nightlife</option>
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
                className={`text-xs tabular-nums ${
                  descriptionValue.length > DESCRIPTION_MAX
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

          <button
            type="submit"
            disabled={isCreating}
            className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-base font-medium text-white shadow-sm transition hover:bg-cyan-500 disabled:opacity-70"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </button>
        </form>

        {/* Post-submit: code + lobby link */}
        {roomCode && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Room Code
                </span>
                <span className="font-mono text-xl font-bold tracking-wider text-cyan-600 dark:text-cyan-400">
                  {roomCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(roomCode)}
                className="text-cyan-600 text-sm hover:underline"
              >
                Copy
              </button>
            </div>

            <Link
              href={`/rooms/${roomCode}/lobby`}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 p-4 text-center text-base text-white font-medium shadow-md hover:opacity-95 active:scale-[0.99] transition duration-200 flex justify-center items-center gap-2 group"
            >
              <span>Go to Room Lobby</span>
              <span
                aria-hidden="true"
                className="inline-block transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
