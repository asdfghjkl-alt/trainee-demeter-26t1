import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Vote, Room } from "@/database";
import { apiHandler } from "@/lib/api-handler";
import { getSession } from "@/lib/session";

export const GET = apiHandler(
  async (req: NextRequest, { params }: { params: { code: string } }) => {
    const roomCode = params.code;

    await connectToDatabase();

    const room = await Room.findOne({ code: roomCode });

    // validate that the room exists
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // obtain the number of votes with roomCode = room code
    const numVotes = await Vote.countDocuments({ roomCode: roomCode });

    return NextResponse.json({ numVotes: numVotes }, { status: 200 });
  },
);
