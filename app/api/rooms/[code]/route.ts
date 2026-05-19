import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room } from "@/database";
import { getSession } from "@/lib/session";

interface Context {
  params: Promise<{ code: string }>;
}

export const GET = apiHandler(async (_req: NextRequest, ctx?: Context) => {
  const session = await getSession();
  if (!session || !session.userData) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { code } = await ctx!.params;

  await connectToDatabase();

  const room = await Room.findOne({ code })
    .populate("participants", "_id fname lname")
    .lean();
  console.log(room);
  if (!room) {
    return NextResponse.json({ message: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({ room }, { status: 200 });
});
