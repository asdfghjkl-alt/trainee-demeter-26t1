import { notFound } from "next/navigation";
import PreferencesForm from "@/components/join/PreferencesForm";
import { getSession } from "@/lib/session";
import { pruneGuestParticipants } from "@/lib/guest";
import connectToDatabase from "@/lib/mongodb";
import RoomModel from "@/database/room.model";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params;

  // Lazily clean up stale guest room entries from the cookie
  await pruneGuestParticipants();

  // Verify the room exists and is still accepting participants
  await connectToDatabase();
  const room = await RoomModel.findOne({ code }).select("status").lean();
  if (!room) notFound();

  const session = await getSession();

  // Autofill name from the session payload
  const user = session?.userData ? { name: session.userData.fname } : undefined;

  if (session) {
    return <PreferencesForm code={code} user={user} />;
  }

  return <PreferencesForm code={code} />;
}
