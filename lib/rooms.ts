// lib/rooms.ts
import api from "@/lib/axios";
import type { Room } from "@/types/room";

export async function getRoom(
  code: string,
  participantId?: string,
): Promise<Room | null> {
  try {
    const res = await api.get(`/rooms/${code}`, {
      params: participantId ? { participantId } : undefined,
    });
    return res.data.room;
  } catch {
    return null;
  }
}

// TEMPORARY mock
// Delete once GET /api/rooms/[code] is live
export const MOCK_ROOM: Room = {
  _id: "mock123",
  name: "TP Dinnor",
  code: "ABC123",
  adminUser: "mock_user_admin",
  status: "waiting",
  categories: [
    { _id: "cat1", name: "Restaurants" },
    { _id: "cat2", name: "Bars" },
  ],
  locations: [
    {
      _id: "loc1",
      name: "The Grounds of Alexandria",
      description: "7a/2 Huntley St, Alexandria NSW 2015",
      latitude: -33.9108,
      longitude: 151.1937,
      category: "cat1",
    },
    {
      _id: "loc2",
      name: "Opera Bar",
      description: "Macquarie St, Sydney NSW 2000",
      latitude: -33.8585,
      longitude: 151.2131,
      category: "cat2",
    },
    {
      _id: "loc3",
      name: "Bills Surry Hills",
      description: "359 Crown St, Surry Hills NSW 2010",
      latitude: -33.8863,
      longitude: 151.2126,
      category: "cat1",
    },
  ],
  createdAt: new Date().toISOString(),
  participants: [
    {
      _id: "p1",
      userId: "mock_user_admin",
      name: "Aidan",
      location: "Fitzroy",
      transportationMode: "transit",
      isGuest: false,
      isAdmin: true,
    },
    {
      _id: "p2",
      name: "Bryan",
      location: "Blacktown",
      transportationMode: "driving",
      isGuest: true,
      isAdmin: false,
    },
  ],
};
