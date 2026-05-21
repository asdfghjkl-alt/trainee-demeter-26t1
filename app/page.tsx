"use client";
import { Fragment } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusCircle, Users, MapPin, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: PlusCircle,
    title: "Create a room",
    description:
      "Set up a meetup in seconds. Choose a name, pick activity categories, and share the unique join code with your friends.",
  },
  {
    step: "02",
    icon: Users,
    title: "Everyone joins & shares preferences",
    description:
      "Friends join with the code — no account needed. Each person enters their starting location, transport mode, and dietary needs.",
  },
  {
    step: "03",
    icon: MapPin,
    title: "Get the fairest meeting spot",
    description:
      "We crunch everyone's data to surface the best locations — fair for all travel times, matching your categories and preferences.",
  },
];

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  return (
    <main className="flex-1 w-full bg-white dark:bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Hand Side: Text & Actions */}
          <div className="flex flex-col space-y-8 max-w-2xl">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                Find the fairest <br className="hidden sm:block" />
                <span className="text-cyan-600 dark:text-cyan-400">
                  place to meet.
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Stop arguing over travel times. We calculate the best possible
                meeting point based on location and preferences for the best
                points to connect.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push("/rooms/create")}
                className="flex items-center justify-center rounded-full bg-cyan-600 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-cyan-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-[#0a0a0a]"
              >
                Create a meetup
              </button>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const code = joinCode.trim().toUpperCase();
                  if (!code) return;
                  try {
                    const res = await fetch(`/api/rooms/${code}/exists`);
                    if (res.status === 404) {
                      toast.error("Invalid code");
                      return;
                    }
                    if (!res.ok) {
                      toast.error("Something went wrong. Please try again.");
                      return;
                    }
                    const { status } = await res.json();
                    if (status === "voting") {
                      toast.error("Voting has already started for this room");
                      return;
                    }
                    if (status === "completed" || status === "closed") {
                      toast.error("This room has already finished");
                      return;
                    }
                  } catch {
                    toast.error("Something went wrong. Please try again.");
                    return;
                  }
                  router.push(`/rooms/${code}/join`);
                }}
                className="flex rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] px-2 py-2 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-transparent transition-all"
              >
                <input
                  name="code"
                  type="text"
                  placeholder="Enter join code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full bg-transparent px-4 text-gray-900 dark:text-white outline-none focus:outline-none focus:ring-0 border-0 placeholder:text-gray-400"
                  required
                />
                <button
                  type="submit"
                  className="flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 px-6 py-2 text-sm font-semibold text-gray-900 dark:text-white transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Join
                </button>
              </form>
            </div>
          </div>

          {/* Right Hand Side: Map Icon */}
          <div className="w-full h-[400px] lg:h-[500px] rounded-2xl flex items-center justify-center">
            <img
              src="/map-icon.png"
              alt="Map illustration"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative border-t border-gray-100 dark:border-gray-900 bg-gray-50/60 dark:bg-[#0d0d0d]">
        {/* Subtle top gradient bleed */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-500/30 to-transparent" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          {/* Section header */}
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Three steps to the perfect meetup
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base">
              From creating a room to discovering the best spot — all in under a
              minute.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-6">
            {HOW_IT_WORKS.map((item, i) => {
              const Icon = item.icon;
              return (
                <Fragment key={item.step}>
                  <div className="relative flex flex-col items-center text-center rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141414] p-8 hover:-translate-y-1 transition-transform duration-200 h-full">
                    {/* Step number watermark */}
                    <span className="absolute top-4 right-5 text-6xl font-black select-none text-gray-100 dark:text-gray-800">
                      {item.step}
                    </span>

                    {/* Icon */}
                    <div className="relative z-10 w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Arrow connector between cards on desktop */}
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-[#0d0d0d] border border-gray-200 dark:border-gray-800 shrink-0 self-center">
                      <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="mt-14 text-center">
            <button
              onClick={() => router.push("/rooms/create")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all"
            >
              Get started for free
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
