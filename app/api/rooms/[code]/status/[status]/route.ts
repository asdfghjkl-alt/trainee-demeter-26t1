import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room } from "@/database";
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

    room.status = newStatus as any;
    await room.save();
  }

  return NextResponse.json(
    { message: "Room status updated successfully", status: room.status },
    { status: 200 },
  );
});
