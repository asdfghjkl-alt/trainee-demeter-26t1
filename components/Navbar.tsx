"use client";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle scroll for navbar hiding/showing
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== "undefined") {
        if (window.scrollY > lastScrollY && window.scrollY > 80) {
          // Scrolling down and scrolled past threshold
          setIsVisible(false);
          setIsDropdownOpen(false); // also close dropdown when hiding
        } else {
          // Scrolling up
          setIsVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="h-16 z-50 relative">
      <nav
        className={`fixed top-0 left-0 w-full border-b border-black/8 dark:border-white/[.145] bg-white dark:bg-[#0a0a0a] transition-transform duration-300 z-50 ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left Side: Brand and Navigation Links */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 group">
                <svg
                  className="w-7 h-7 text-cyan-600 dark:text-cyan-600 opacity-80 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  aria-label="Rendezvous Logo"
                >
                  <g clipPath="url(#a)">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1"
                      fill="currentColor"
                    />
                  </g>
                  <defs>
                    <clipPath id="a">
                      <path fill="#fff" d="M0 0h16v16H0z" />
                    </clipPath>
                  </defs>
                </svg>
                <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-600">
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

              {isLoading ? (
                <div className="flex items-center space-x-4 sm:space-x-6">
                  <div className="hidden sm:block h-5 w-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-9 w-24 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                </div>
              ) : (
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
    </div>
  );
}
