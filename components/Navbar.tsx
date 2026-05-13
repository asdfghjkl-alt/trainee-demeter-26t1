"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="w-full border-b border-black/8 dark:border-white/[.145] bg-white dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side: Brand and Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                Rendezvous
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              <Link
                href="/explore"
                className="text-sm font-medium text-gray-700 hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400 transition-colors"
              >
                Explore
              </Link>
              <Link
                href="/saved"
                className="text-sm font-medium text-gray-700 hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400 transition-colors"
              >
                Saved
              </Link>
            </div>
          </div>

          {/* Right Side: User Elements */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            <ThemeToggle />

            {!isLoading && (
              <>
                {!user ? (
                  <>
                    <Link
                      href="/auth/login"
                      className="hidden sm:block text-sm font-medium text-gray-700 hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400 transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/auth/register"
                      className="text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 px-5 py-2 rounded-full transition-all shadow-sm hover:shadow-md"
                    >
                      Sign up
                    </Link>
                  </>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400 transition-colors focus:outline-none"
                    >
                      <span>Welcome, {user.fname}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-[#111] ring-1 ring-black ring-opacity-5 dark:ring-white/[.145] divide-y divide-gray-100 dark:divide-gray-800 focus:outline-none z-50">
                        <div className="py-1 text-left text-sm text-gray-700 dark:text-gray-300">
                          <Link
                            href="/profile"
                            onClick={() => setIsDropdownOpen(false)}
                            className="group flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-cyan-600 dark:hover:text-cyan-400"
                          >
                            <User className="mr-3 h-4 w-4" />
                            Profile
                          </Link>
                          <Link
                            href="/settings"
                            onClick={() => setIsDropdownOpen(false)}
                            className="group flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-cyan-600 dark:hover:text-cyan-400"
                          >
                            <Settings className="mr-3 h-4 w-4" />
                            Settings
                          </Link>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              logout();
                            }}
                            className="group flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <LogOut className="mr-3 h-4 w-4" />
                            Log out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
