import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { Metadata } from "next";
import LobbyView from "@/components/room/LobbyView";
import connectToDatabase from "@/lib/mongodb";
import RoomModel from "@/database/room.model";

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
  const session = await getSession();

  // Must be logged in to view a room
  // (guests will be handled differently once ITER1-006 is done)
  if (!session) {
    redirect(`/auth/login?redirect=/rooms/${code}`);
  }

  await connectToDatabase();
  const doc = await RoomModel.findOne({ code })
    .populate("participants", "_id fname lname")
    .populate("categories")
    .lean();
  if (!doc) {
    notFound();
  }

  // Serialise ObjectIds / Dates to plain strings for the client component
  const room = JSON.parse(JSON.stringify(doc));

  const currentUserId = session.userData._id;

  return (
    <main className="flex-1 w-full bg-white dark:bg-[#0a0a0a]">
      <LobbyView initialRoom={room} currentUserId={currentUserId} />
    </main>
  );
}
