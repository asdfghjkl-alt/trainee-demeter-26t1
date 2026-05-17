import { NextResponse } from "next/server";

function pageNotFound() {
  return NextResponse.json({ message: "Page not found" }, { status: 404 });
}

export const GET = pageNotFound;
export const POST = pageNotFound;
export const PUT = pageNotFound;
export const DELETE = pageNotFound;
export const PATCH = pageNotFound;
export const OPTIONS = pageNotFound;
