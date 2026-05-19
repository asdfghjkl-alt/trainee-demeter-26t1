import { cookies } from "next/headers";
import connectToDatabase from "@/lib/mongodb";
import { Room } from "@/database";

const GUEST_COOKIE_NAME = process.env.GUEST_COOKIE_NAME ?? "guest_participants";

// 30 days — long enough to persist across browser sessions
const GUEST_COOKIE_DURATION = 30 * 24 * 60 * 60 * 1000;

/** Shared cookie options used when writing the guest cookie. */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(Date.now() + GUEST_COOKIE_DURATION),
  };
}

/**
 * Map of roomCode → participantId for guest users.
 * Allows a single guest to be a participant in multiple rooms simultaneously.
 */
export type GuestParticipants = Record<string, string>;

/**
 * Reads the guest participants map from the cookie.
 * Returns an empty object if the cookie is absent or malformed.
 */
export async function getGuestParticipants(): Promise<GuestParticipants> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(GUEST_COOKIE_NAME)?.value;
    if (!raw) return {};
    return JSON.parse(raw) as GuestParticipants;
  } catch {
    return {};
  }
}

/**
 * Returns the participantId for a specific room, or null if not found.
 */
export async function getGuestParticipantId(
  roomCode: string,
): Promise<string | null> {
  const participants = await getGuestParticipants();
  return participants[roomCode] ?? null;
}

/**
 * Adds or updates the participantId for a given room in the cookie.
 */
export async function setGuestParticipant(
  roomCode: string,
  participantId: string,
): Promise<void> {
  try {
    const cookieStore = await cookies();
    const existing = await getGuestParticipants();
    const updated: GuestParticipants = {
      ...existing,
      [roomCode]: participantId,
    };
    cookieStore.set(
      GUEST_COOKIE_NAME,
      JSON.stringify(updated),
      cookieOptions(),
    );
  } catch (error) {
    console.error("Failed to set guest participant cookie:", error);
  }
}

/**
 * Removes the participantId for a specific room from the cookie.
 * Used when a guest leaves or a room ends.
 */
export async function clearGuestParticipant(roomCode: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    const existing = await getGuestParticipants();
    const { [roomCode]: _, ...rest } = existing;

    if (Object.keys(rest).length === 0) {
      cookieStore.set(GUEST_COOKIE_NAME, "", { expires: new Date(0) });
    } else {
      cookieStore.set(GUEST_COOKIE_NAME, JSON.stringify(rest), cookieOptions());
    }
  } catch (error) {
    console.error("Failed to clear guest participant cookie:", error);
  }
}

/**
 * Removes stale entries from the guest cookie — rooms that no longer exist
 * or have reached `completed` status. Call this lazily (e.g. on page load)
 * to keep the cookie size in check.
 */
export async function pruneGuestParticipants(): Promise<void> {
  try {
    const existing = await getGuestParticipants();
    const roomCodes = Object.keys(existing);
    if (roomCodes.length === 0) return;

    await connectToDatabase();

    // Find rooms that are still active (not completed / deleted)
    const activeRooms = await Room.find({
      code: { $in: roomCodes },
      status: { $ne: "completed" },
    })
      .select("code")
      .lean();

    const activeCodes = new Set(activeRooms.map((r) => r.code));
    const pruned = Object.fromEntries(
      Object.entries(existing).filter(([code]) => activeCodes.has(code)),
    );

    const cookieStore = await cookies();
    if (Object.keys(pruned).length === 0) {
      // All rooms are done — clear the cookie entirely
      cookieStore.set(GUEST_COOKIE_NAME, "", { expires: new Date(0) });
    } else if (Object.keys(pruned).length < roomCodes.length) {
      // Some entries were pruned — write the slimmed-down map back
      cookieStore.set(
        GUEST_COOKIE_NAME,
        JSON.stringify(pruned),
        cookieOptions(),
      );
    }
    // If nothing changed, don't touch the cookie
  } catch (error) {
    console.error("Failed to prune guest participant cookie:", error);
  }
}
