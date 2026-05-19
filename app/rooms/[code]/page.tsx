import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import LobbyView from "@/components/room/LobbyView";
import RoomPageClient from "@/components/room/RoomPageClient";

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

  return (
    <main className="flex-1 w-full bg-white dark:bg-[#0a0a0a]">
      {/* Admin view */}
      {/* <RoomPageClient code={code} currentUserId="mock_user_admin" /> */}

      {/* User view - uncomment */}
      <RoomPageClient code={code} currentUserId="some_other_user" />
    </main>
  );
}