import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room } from "@/database";

interface Context {
  params: Promise<{ code: string }>;
}

export const GET = apiHandler(async (_req: NextRequest, ctx?: Context) => {
  const { code } = await ctx!.params;

  await connectToDatabase();

  const room = await Room.findOne({ code }, { status: 1 }).lean<{ status: string } | null>();
  if (!room) {
    return NextResponse.json({ message: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({ status: room.status }, { status: 200 });
});
