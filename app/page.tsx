"use client"
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
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
                <span className="text-cyan-600 dark:text-cyan-400">place to meet.</span>
              </h1>
              <p className="text-lg lg:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Stop arguing over travel times. We calculate the best possible meeting point based on location and preferences for the best points to connect.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="flex items-center justify-center rounded-full bg-cyan-600 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-cyan-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-[#0a0a0a]">
                Create a meetup
              </button>
              
              <form className="flex rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] px-2 py-2 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-transparent transition-all">
                <input 
                  name="code"
                  type="text" 
                  placeholder="Enter join code" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full bg-transparent px-4 text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!joinCode.trim()) return;
                    if (isNaN(Number(joinCode.trim()))) {
                      setError("Enter a number")
                      return;
                    }
                    
                    router.push(`/join/${joinCode}`)
                  }}
                  className="flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 px-6 py-2 text-sm font-semibold text-gray-900 dark:text-white transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Join
                </button>
              </form>
            

              {error && (
                <p className="mt-2 text-sm text-red-500">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Right Hand Side: Image Placeholder */}
          <div className="w-full h-[400px] lg:h-[500px] rounded-2xl border-2 border-dashed border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-950/20 flex flex-col items-center justify-center text-cyan-600/50 dark:text-cyan-400/50">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span className="text-sm font-medium uppercase tracking-wider">Image Placeholder</span>
          </div>

        </div>
      </section>
    </main>
  );
}
