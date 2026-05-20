import { notFound, redirect } from "next/navigation";
import PreferencesForm from "@/components/join/PreferencesForm";
import { getSession } from "@/lib/session";
import { getGuestParticipantId } from "@/lib/guest";
import connectToDatabase from "@/lib/mongodb";
import { Room } from "@/database";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params;

  // Verify the room exists and is still accepting participants
  await connectToDatabase();
  const room = await Room.findOne({ code }).lean();
  if (!room) notFound();

  const session = await getSession();
  let alreadyInRoom = false;

  if (session?.userData?._id) {
    alreadyInRoom = room.participants.some(
      (p: any) => p.userId && p.userId.toString() === session.userData._id
    );
  } else {
    const guestParticipantId = await getGuestParticipantId(code);
    if (guestParticipantId) {
      alreadyInRoom = room.participants.some(
        (p: any) => p._id && p._id.toString() === guestParticipantId
      );
    }
  }

  // If already joined, redirect directly to the lobby
  if (alreadyInRoom) {
    redirect(`/rooms/${code}`);
  }

  // Autofill name from the session payload
  const user = session?.userData ? { name: session.userData.fname } : undefined;

  const meetingDirection = room.meetingDirection || "to-venue";

  if (session) {
    return <PreferencesForm code={code} user={user} meetingDirection={meetingDirection} />;
  }

  return <PreferencesForm code={code} meetingDirection={meetingDirection} />;
}
