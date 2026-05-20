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
    color: "from-cyan-400 to-cyan-600",
    glow: "shadow-cyan-500/20",
    border: "border-cyan-200 dark:border-cyan-800",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    numberColor: "text-cyan-600/20 dark:text-cyan-400/20",
  },
  {
    step: "02",
    icon: Users,
    title: "Everyone joins & shares preferences",
    description:
      "Friends join with the code — no account needed. Each person enters their starting location, transport mode, and dietary needs.",
    color: "from-violet-400 to-violet-600",
    glow: "shadow-violet-500/20",
    border: "border-violet-200 dark:border-violet-800",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    numberColor: "text-violet-600/20 dark:text-violet-400/20",
  },
  {
    step: "03",
    icon: MapPin,
    title: "Get the fairest meeting spot",
    description:
      "We crunch everyone's data to surface the best locations — fair for all travel times, matching your categories and preferences.",
    color: "from-emerald-400 to-emerald-600",
    glow: "shadow-emerald-500/20",
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    numberColor: "text-emerald-600/20 dark:text-emerald-400/20",
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

          {/* Right Hand Side: Image Placeholder */}
          <div className="w-full h-[400px] lg:h-[500px] rounded-2xl border-2 border-dashed border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-950/20 flex flex-col items-center justify-center text-cyan-600/50 dark:text-cyan-400/50">
            <svg
              className="w-16 h-16 mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <span className="text-sm font-medium uppercase tracking-wider">
              Image Placeholder
            </span>
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
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-200 dark:border-cyan-800">
              How it works
            </span>
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
                  <div
                    className={`relative flex flex-col items-center text-center rounded-2xl border ${item.border} ${item.bg} p-8 shadow-lg ${item.glow} hover:-translate-y-1 transition-transform duration-200 h-full`}
                  >
                    {/* Step number watermark */}
                    <span
                      className={`absolute top-4 right-5 text-6xl font-black select-none ${item.numberColor}`}
                    >
                      {item.step}
                    </span>

                    {/* Icon circle */}
                    <div
                      className={`relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg`}
                    >
                      <Icon className="w-7 h-7 text-white" />
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
                    <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-[#0d0d0d] border border-gray-200 dark:border-gray-800 shadow-sm shrink-0 self-center">
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
