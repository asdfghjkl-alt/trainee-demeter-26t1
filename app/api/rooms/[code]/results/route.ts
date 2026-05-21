import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room, Vote } from "@/database";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

interface LeanParticipant {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
}

interface LeanLocation {
  _id: Types.ObjectId;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  addedByAdmin?: boolean;
  category?: string;
}

interface LeanVote {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  participantId: Types.ObjectId;
  rankings: Types.ObjectId[];
}

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
      isAuthorized = (room.participants as unknown as LeanParticipant[]).some(
        (p) => p._id && p._id.toString() === participantId,
      );
    } else {
      const session = await getSession();
      if (session?.userData?._id) {
        isAuthorized = (room.participants as unknown as LeanParticipant[]).some(
          (p) => p.userId && p.userId.toString() === session.userData._id,
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
        { status: 400 },
      );
    }

    // Calculate votes for all candidate locations dynamically to ensure consistency
    const breakdown: Record<string, number> = {};
    const locations = room.locations as unknown as LeanLocation[];
    locations.forEach((loc) => {
      breakdown[loc._id.toString()] = 0;
    });

    const votes = (await Vote.find({ roomId: room._id })) as unknown as LeanVote[];
    votes.forEach((vote) => {
      const firstPref = vote.rankings?.[0]?.toString();
      if (firstPref && firstPref in breakdown) {
        breakdown[firstPref] += 1;
      }
    });

    // Sort locations by votes descending
    const sortedLocations = [...locations].sort((a, b) => {
      const votesA = breakdown[a._id.toString()] || 0;
      const votesB = breakdown[b._id.toString()] || 0;
      return votesB - votesA;
    });

    // Assign ranks (standard tournament ranking: 1, 2, 2, 4)
    let currentRank = 1;
    let prevVotes = -1;
    const results = sortedLocations.map((loc, index) => {
      const votesCount = breakdown[loc._id.toString()] || 0;
      if (votesCount !== prevVotes) {
        currentRank = index + 1;
        prevVotes = votesCount;
      }
      return {
        ...loc,
        votes: votesCount,
        rank: currentRank,
      };
    });

    return NextResponse.json({ results }, { status: 200 });
  },
);
