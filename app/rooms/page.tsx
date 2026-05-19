import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import connectToDatabase from "@/lib/mongodb";
import { Room } from "@/database";
import RoomsGrid from "@/components/room/RoomsGrid";

export const metadata: Metadata = {
  title: "My Rooms — Rendezvous",
  description: "View all the rooms you have joined or created.",
};

export default async function RoomsPage() {
  const session = await getSession();
  if (!session?.userData?._id) {
    redirect("/auth/login?redirect=/rooms");
  }

  const userId = session.userData._id;

  await connectToDatabase();

  // Fetch all rooms where the user is the admin or a registered participant
  const docs = await Room.find({
    $or: [{ adminUser: userId }, { "participants.userId": userId }],
  })
    .populate("categories", "name")
    .sort({ createdAt: -1 })
    .lean();

  const visible = docs.filter((room) => {
    if (room.status === "closed") return room.adminUser.toString() === userId;
    return true;
  });

  // Split into rooms the user owns vs rooms they joined as a participant
  const ownedRooms = visible.filter((r) => r.adminUser.toString() === userId);
  const joinedRooms = visible.filter((r) => r.adminUser.toString() !== userId);

  const serialized = (arr: typeof visible) => JSON.parse(JSON.stringify(arr));

  return (
    <main className="flex-1 w-full bg-white dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            My Rooms
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">
            Rooms you've created or joined. Click a room to enter its lobby.
          </p>
        </div>
        <RoomsGrid
          ownedRooms={serialized(ownedRooms)}
          joinedRooms={serialized(joinedRooms)}
          currentUserId={userId}
        />
      </div>
    </main>
  );
}
