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
  locations: [],
  createdAt: new Date().toISOString(),
  participants: [
    {
      _id: "p1",
      userId: "mock_user_admin",
      name: "Aidan",
      location: "Fitzroy",
      transportationMode: "train",
      isGuest: false,
      isAdmin: true,
    },
    {
      _id: "p2",
      name: "Bryan",
      location: "Richmond",
      transportationMode: "walking",
      isGuest: true,
      isAdmin: false,
    },
  ],
};
