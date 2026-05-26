import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room, Category, User, IParticipant } from "@/database";
import { getSession } from "@/lib/session";
import { roomSchema } from "@/lib/schemas";

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || !session.userData) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  await connectToDatabase();

  const user = await User.findById(session.userData._id);
  if (!user) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  const body = await req.json();
  const { error, value } = roomSchema.validate(body);

  if (error) {
    return NextResponse.json(
      { message: error.details[0].message },
      { status: 400 },
    );
  }

  const {
    name,
    categoryIds,
    location,
    country,
    dietaryRequirements,
    dietaryNotes,
    preferences,
    transportationMode,
    date,
    meetingDirection,
    description,
    travelBudgetMinutes,
    willingness,
  } = value;

  const existingCategories = await Category.find({ _id: { $in: categoryIds } });
  if (existingCategories.length !== categoryIds.length) {
    return NextResponse.json(
      { message: "One or more invalid Category IDs provided" },
      { status: 400 },
    );
  }

  // Generate a unique 6-character code
  let code = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    code = generateCode();
    const existingRoom = await Room.findOne({ code });

    if (!existingRoom) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    return NextResponse.json(
      { message: "Failed to generate a unique room code" },
      { status: 500 },
    );
  }

  let latitude: number | undefined;
  let longitude: number | undefined;

  const token = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token && location) {
    try {
      const searchText = encodeURIComponent(location);
      const countryParam = country && country !== "global" ? `&country=${country}` : "";
      const geoResponse = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?q=${searchText}${countryParam}&limit=1&access_token=${token}`
      );
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        if (geoData.features && geoData.features.length > 0) {
          const feat = geoData.features[0];
          longitude = feat.geometry.coordinates[0];
          latitude = feat.geometry.coordinates[1];
        }
      }
    } catch (err) {
      console.error("Failed to geocode admin participant location:", err);
    }
  }

  const adminParticipant: IParticipant = {
    userId: new mongoose.Types.ObjectId(session.userData._id),
    name: user.fname,
    location,
    dietaryRequirements,
    dietaryNotes,
    preferences,
    transportationMode,
    isGuest: false,
    isAdmin: true,
    joinedAt: new Date(),
    latitude,
    longitude,
    willingness,
  };

  const newRoom = new Room({
    name,
    code,
    adminUser: session.userData._id,
    participants: [adminParticipant],
    categories: categoryIds,
    status: "waiting",
    date: date ? new Date(date) : undefined,
    meetingDirection,
    description,
    travelBudgetMinutes: travelBudgetMinutes ?? 20,
    country,
  });

  await newRoom.save();

  return NextResponse.json(
    {
      message: "Room created successfully",
      room: newRoom,
      joinUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/rooms/${code}/join`,
    },
    { status: 201 },
  );
});
