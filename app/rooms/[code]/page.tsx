import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import LobbyView from "@/components/room/LobbyView";
import connectToDatabase from "@/lib/mongodb";
import { Room } from "@/database";
import { getGuestParticipantId } from "@/lib/guest";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Room ${code} — Rendezvous`,
  };
}

export default async function RoomPage({ params }: Props) {
  const { code } = await params;

  await connectToDatabase();
  const doc = await Room.findOne({ code }).populate("categories").lean();
  if (!doc) {
    notFound();
  }

  const session = await getSession();
  let currentParticipantId: string | null = null;

  if (session?.userData?._id) {
    // For logged-in users, find their participantId from the room's participants
    const participant = doc.participants.find(
      (p: any) => p.userId && p.userId.toString() === session.userData._id,
    );
    if (participant) {
      currentParticipantId = participant._id.toString();
    }
  } else {
    // If not logged in, check if they are a guest participant in this room
    const guestParticipantId = await getGuestParticipantId(code);
    if (guestParticipantId) {
      // Verify that this guest participant actually exists in this room
      const participant = doc.participants.find(
        (p: any) => p._id && p._id.toString() === guestParticipantId,
      );
      if (participant) {
        currentParticipantId = participant._id.toString();
      }
    }
  }

  // If they are neither a registered participant nor a guest participant of this room, 404
  if (!currentParticipantId) {
    notFound();
  }

  // Serialise ObjectIds / Dates to plain strings for the client component
  const room = JSON.parse(JSON.stringify(doc));

  return (
    <main className="flex-1 w-full bg-white dark:bg-[#0a0a0a]">
      <LobbyView
        initialRoom={room}
        currentParticipantId={currentParticipantId}
      />
    </main>
  );
}
