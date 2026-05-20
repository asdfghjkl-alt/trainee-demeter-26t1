import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room } from "@/database";
import { getSession } from "@/lib/session";

export const GET = apiHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> },
  ) => {
    const { code } = await params;
    const participantId = req.nextUrl.searchParams.get("participantId");

    await connectToDatabase();

    const room = await Room.findOne({ code }).populate("categories").lean();
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // Authorize request: either the participantId is in the room's participants list,
    // or a logged-in user matches one of the participants.
    let isAuthorized = false;

    if (participantId) {
      isAuthorized = room.participants.some(
        (p: any) => p._id && p._id.toString() === participantId,
      );
    } else {
      const session = await getSession();
      if (session?.userData?._id) {
        isAuthorized = room.participants.some(
          (p: any) => p.userId && p.userId.toString() === session.userData._id,
        );
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { message: "Unauthorized to access this room" },
        { status: 401 },
      );
    }

    if (room.status !== "completed" && room.status !== "closed") {
      return NextResponse.json(
        { message: "Voting has not completed yet for this room" },
        { status: 400 }
      );
    }

    const winnersList = room.winners || [];
    const winningLocations = room.locations.filter((loc: any) =>
      winnersList.some((winnerId: any) => winnerId.toString() === loc._id.toString())
    );

    return NextResponse.json({ winners: winningLocations }, { status: 200 });
  },
);
