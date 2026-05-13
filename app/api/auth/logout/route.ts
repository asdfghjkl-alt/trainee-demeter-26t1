import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";

export const POST = apiHandler(async () => {
  await clearSession();
  return NextResponse.json({ message: "Logged out successfully" });
});
