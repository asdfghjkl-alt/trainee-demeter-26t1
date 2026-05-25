"use client";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  User,
  Settings,
  LogOut,
  Tags,
  DoorOpen,
  PlusCircle,
} from "lucide-react";

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
                <Image
                  src="/logo.png"
                  alt="Rendezvous Logo"
                  width={50}
                  height={50}
                  className="opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-600">
                  Rendezvous
                </span>
              </Link>

              <div className="hidden md:flex items-center space-x-6">
                <Link
                  href="/rooms/create"
                  className="text-sm font-medium text-gray-700 hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400 transition-colors"
                >
                  Create Meetup
                </Link>
                <Link
                  href="/rooms"
                  className="text-sm font-medium text-gray-700 hover:text-cyan-600 dark:text-gray-300 dark:hover:text-cyan-400 transition-colors"
                >
                  My Rooms
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
                              href="/rooms/create"
                              onClick={() => setIsDropdownOpen(false)}
                              className="group flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-cyan-600 dark:hover:text-cyan-400"
                            >
                              <PlusCircle className="mr-3 h-4 w-4" />
                              Create Meetup
                            </Link>
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
                            <Link
                              href="/rooms"
                              onClick={() => setIsDropdownOpen(false)}
                              className="group flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-cyan-600 dark:hover:text-cyan-400"
                            >
                              <DoorOpen className="mr-3 h-4 w-4" />
                              My Rooms
                            </Link>
                          </div>
                          {user.admin && (
                            <div className="py-1 text-left text-sm text-gray-700 dark:text-gray-300">
                              <Link
                                href="/categories"
                                onClick={() => setIsDropdownOpen(false)}
                                className="group flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-cyan-600 dark:hover:text-cyan-400"
                              >
                                <Tags className="mr-3 h-4 w-4" />
                                Manage Categories
                              </Link>
                            </div>
                          )}
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
