import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { User } from "@/database";

export const GET = apiHandler(async () => {
  await connectToDatabase();
  const session = await getSession();

  if (!session || !session.userData) {
    return NextResponse.json(
      { favoriteVenues: [] },
      { status: 200 }
    );
  }

  const user = await User.findById(session.userData._id).select("favoriteVenues");
  
  if (!user) {
    return NextResponse.json(
      { favoriteVenues: [] },
      { status: 200 }
    );
  }

  return NextResponse.json({
    favoriteVenues: user.favoriteVenues || [],
  });
});

export const POST = apiHandler(async (req: NextRequest) => {
  await connectToDatabase();
  const session = await getSession();

  if (!session || !session.userData) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { venue } = await req.json();

  if (!venue || !venue.name || typeof venue.latitude !== "number" || typeof venue.longitude !== "number") {
    return NextResponse.json(
      { message: "Invalid venue data" },
      { status: 400 }
    );
  }

  // Update MongoDB
  const updatedUser = await User.findByIdAndUpdate(
    session.userData._id,
    {
      $push: { favoriteVenues: venue }
    },
    { returnDocument: 'after' }
  ).select("-password");

  if (!updatedUser) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: "Venue added to favorites",
    favoriteVenues: updatedUser.favoriteVenues || [],
  });
});

export const DELETE = apiHandler(async (req: NextRequest) => {
  await connectToDatabase();
  const session = await getSession();

  if (!session || !session.userData) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { venue } = await req.json();

  if (!venue || !venue.name || typeof venue.latitude !== "number" || typeof venue.longitude !== "number") {
    return NextResponse.json(
      { message: "Invalid venue data" },
      { status: 400 }
    );
  }

  // Update MongoDB to pull the matching venue
  const updatedUser = await User.findByIdAndUpdate(
    session.userData._id,
    {
      $pull: { 
        favoriteVenues: { 
          name: venue.name,
          latitude: venue.latitude,
          longitude: venue.longitude
        } 
      }
    },
    { returnDocument: 'after' }
  ).select("-password");

  if (!updatedUser) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: "Venue removed from favorites",
    favoriteVenues: updatedUser.favoriteVenues || [],
  });
});
