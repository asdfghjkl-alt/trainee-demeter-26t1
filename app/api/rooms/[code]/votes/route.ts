import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Vote, Room } from "@/database";
import { apiHandler } from "@/lib/api-handler";

export const POST = apiHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> },
  ) => {
    const { code } = await params;
    const roomCode = code;
    const body = await req.json();
    let { participantId, rankings } = body;

    if (!participantId || !Array.isArray(rankings)) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if the room exists
    const room = await Room.findOne({ code: roomCode });
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // Check if the room is currently in voting status
    if (room.status !== "voting") {
      return NextResponse.json(
        { message: "Voting is not currently active for this room" },
        { status: 400 }
      );
    }

    // Validate that all ranked location IDs exist in the room's locations
    const roomLocationIds = new Set(
      room.locations.map((loc: any) => loc._id.toString()),
    );

    const allRankingsValid = rankings.every((rankId: string) =>
      roomLocationIds.has(rankId),
    );

    if (!allRankingsValid) {
      return NextResponse.json(
        { message: "One or more ranked locations are invalid for this room" },
        { status: 400 },
      );
    }

    // check for duplicates
    const exists = await Vote.findOne({ roomId: room._id, participantId });

    if (exists) {
      return NextResponse.json(
        { message: "Only one vote accepted from each user" },
        { status: 409 },
      );
    }

    // store the vote in database
    await Vote.create({
      roomId: room._id,
      participantId: participantId,
      rankings: rankings,
    });

    return NextResponse.json({ status: 200 });
  },
);

export const GET = apiHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> },
  ) => {
    const { code } = await params;
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json({ message: "Missing participantId" }, { status: 400 });
    }

    await connectToDatabase();

    const room = await Room.findOne({ code });
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    const vote = await Vote.findOne({ roomId: room._id, participantId });

    return NextResponse.json({ hasVoted: !!vote }, { status: 200 });
  },
);
