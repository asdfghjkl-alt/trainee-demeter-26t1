"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { UserCircle, Mail, Phone, MapPin, ExternalLink, HeartCrack, Loader2 } from "lucide-react";

interface FavoriteVenue {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [venues, setVenues] = useState<FavoriteVenue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      api.get("/users/favorites")
        .then((res) => {
          setVenues(res.data.favoriteVenues || []);
        })
        .catch(() => {
          toast.error("Failed to load favorite venues");
        })
        .finally(() => {
          setLoadingVenues(false);
        });
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="flex-1 w-full bg-white dark:bg-[#0a0a0a] flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  const removeVenue = async (venue: FavoriteVenue) => {
    try {
      setVenues((prev) => prev.filter(
        (v) => !(v.name === venue.name && v.latitude === venue.latitude && v.longitude === venue.longitude)
      ));
      await api.delete("/users/favorites", { data: { venue } });
      toast.success("Removed from favourites");
    } catch {
      toast.error("Failed to remove venue");
      // Revert optimistic update on failure
      api.get("/users/favorites").then(res => setVenues(res.data.favoriteVenues || []));
    }
  };

  const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  // We typecast because AuthContext's SessionPayload doesn't strictly define these runtime fields yet
  const fullUser = user as any;

  return (
    <main className="flex-1 w-full bg-white dark:bg-[#0a0a0a] py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Profile</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your account details and favorite meeting spots.</p>
        </div>

        {/* Account Details */}
        <div className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Account Details</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <UserCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {fullUser.fname} {fullUser.lname || ""}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-gray-900 dark:text-white font-semibold">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-gray-900 dark:text-white font-semibold">{fullUser.phone || "Not provided"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Favorite Venues */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Favorite Venues</h2>
          
          {loadingVenues ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
            </div>
          ) : venues.length === 0 ? (
            <div className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center shadow-sm">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No favorites yet</h3>
              <p className="text-gray-500 dark:text-gray-400">
                When you see a venue you like in the results page, click the heart icon to save it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.map((venue, idx) => (
                <div key={idx} className="flex flex-col bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{venue.name}</h3>
                    {venue.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                        {venue.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/60 mt-auto">
                    <a
                      href={mapsUrl(venue.latitude, venue.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Maps
                    </a>
                    <button
                      onClick={() => removeVenue(venue)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 dark:text-pink-400 dark:bg-pink-950/30 dark:hover:bg-pink-900/40 rounded-lg transition-colors"
                    >
                      <HeartCrack className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
