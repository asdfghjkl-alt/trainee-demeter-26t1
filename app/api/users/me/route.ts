import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { User } from "@/database";

export const GET = apiHandler(async () => {
  await connectToDatabase();
  const session = await getSession();

  if (!session || !session.userData) {
    return NextResponse.json({ user: null });
  }

  const user = await User.findById(session.userData._id).select("-password");
  return NextResponse.json({ user });
});
