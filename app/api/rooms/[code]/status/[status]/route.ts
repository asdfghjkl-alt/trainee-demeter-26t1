import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room, Vote } from "@/database";
import { getSession } from "@/lib/session";

interface Context {
  params: Promise<{ code: string; status: string }>;
}

export const PUT = apiHandler(async (req: NextRequest, ctx: Context) => {
  const session = await getSession();
  if (!session || !session.userData) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const { code, status: newStatus } = await ctx.params;

  const allowedStatuses = ["waiting", "voting", "completed", "closed"];
  if (!allowedStatuses.includes(newStatus)) {
    return NextResponse.json(
      { message: `Invalid room status: ${newStatus}` },
      { status: 400 },
    );
  }

  const room = await Room.findOne({ code });
  if (!room) {
    return NextResponse.json({ message: "Room not found" }, { status: 404 });
  }

  // Check if caller is an admin participant
  const isRoomAdmin =
    room.adminUser.toString() === session.userData._id.toString() ||
    room.participants.some(
      (p: any) =>
        p.userId &&
        p.userId.toString() === session.userData._id.toString() &&
        p.isAdmin,
    );

  if (!isRoomAdmin) {
    return NextResponse.json(
      { message: "Forbidden: Only room admins can update the status" },
      { status: 403 },
    );
  }

  // Validate status transition
  if (room.status !== newStatus) {
    const validNextStatus: Record<string, string> = {
      waiting: "voting",
      voting: "completed",
      completed: "closed",
    };

    if (validNextStatus[room.status] !== newStatus) {
      return NextResponse.json(
        {
          message: `Invalid status transition from '${room.status}' to '${newStatus}'`,
        },
        { status: 400 },
      );
    }

    if (newStatus === "voting" && (!room.locations || room.locations.length <= 1)) {
      return NextResponse.json(
        {
          message: "Cannot start voting with 1 or fewer locations. Please add at least 2 locations.",
        },
        { status: 400 },
      );
    }

    if (newStatus === "completed") {
      const votes = await Vote.find({ roomId: room._id });
      const breakdown: Record<string, number> = {};
      
      room.locations.forEach((loc: any) => {
        breakdown[loc._id.toString()] = 0;
      });

      votes.forEach((vote: any) => {
        const firstPref = vote.rankings?.[0]?.toString();
        if (firstPref && firstPref in breakdown) {
          breakdown[firstPref] += 1;
        }
      });

      const maxVotes = Math.max(...Object.values(breakdown), 0);
      const winners = Object.keys(breakdown).filter(
        (locId) => breakdown[locId] === maxVotes
      );

      room.winners = winners as any;
      room.voteBreakdown = breakdown;
    }

    room.status = newStatus as any;
    await room.save();
  }

  return NextResponse.json(
    { message: "Room status updated successfully", status: room.status },
    { status: 200 },
  );
});
