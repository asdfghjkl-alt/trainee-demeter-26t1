import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room, User } from "@/database";
import { getSession } from "@/lib/session";
import { addLocationSchema } from "@/lib/schemas";

export const POST = apiHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> },
  ) => {
    // Check auth
    const session = await getSession();
    if (!session || !session.userData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Connect to DB
    await connectToDatabase();

    // Check if user exists in DB
    const user = await User.findById(session.userData._id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Validate body
    const body = await req.json();
    const { error, value } = addLocationSchema.validate(body);

    if (error) {
      return NextResponse.json(
        { message: error.details[0].message },
        { status: 400 },
      );
    }

    const { name, latitude, longitude, description, category } = value;

    // Verify the room exists
    const { code } = await params;
    const room = await Room.findOne({ code });
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // Verify the user is the admin of the room
    if (room.adminUser.toString() !== session.userData._id.toString()) {
      return NextResponse.json(
        { message: "Forbidden: Only the room admin can add locations" },
        { status: 403 },
      );
    }

    let newLocation;

    if (typeof latitude === "number" && typeof longitude === "number") {
      newLocation = {
        name,
        latitude,
        longitude,
        description: description || "",
        category: category || undefined,
        addedByAdmin: true,
      };
    } else {
      // Mapbox Geocoding
      const NEXT_PUBLIC_MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!NEXT_PUBLIC_MAPBOX_TOKEN) {
        return NextResponse.json(
          { message: "Server configuration error: missing Mapbox token" },
          { status: 500 },
        );
      }

      const searchText = encodeURIComponent(name);
      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?q=${searchText}&country=au&access_token=${NEXT_PUBLIC_MAPBOX_TOKEN}`,
      );

      const data = await response.json();

      if (!response.ok || !data.features || data.features.length === 0) {
        return NextResponse.json(
          { message: "Could not find coordinates for this location name" },
          { status: 400 },
        );
      }

      const feature = data.features[0];

      newLocation = {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
        name: feature.properties.name,
        description:
          feature.properties.place_formatted ||
          feature.properties.full_address ||
          "",
        category: category || undefined,
        addedByAdmin: true,
      };
    }

    room.locations.push(newLocation);
    await room.save();

    return NextResponse.json(
      { message: "Location added successfully", location: room.locations[room.locations.length - 1] },
      { status: 201 },
    );
  },
);

export const PATCH = apiHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> },
  ) => {
    const session = await getSession();
    if (!session || !session.userData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { code } = await params;
    const room = await Room.findOne({ code });
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    if (room.adminUser.toString() !== session.userData._id.toString()) {
      return NextResponse.json(
        { message: "Forbidden: Only the room admin can update locations" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { locationId, category } = body;

    if (!locationId) {
      return NextResponse.json(
        { message: "locationId is required" },
        { status: 400 },
      );
    }

    const locationDoc = room.locations.find(
      (loc: any) => loc._id && loc._id.toString() === locationId,
    );
    if (!locationDoc) {
      return NextResponse.json(
        { message: "Location not found" },
        { status: 404 },
      );
    }

    locationDoc.category = category || undefined;
    room.markModified("locations");
    await room.save();

    return NextResponse.json(
      { message: "Location updated successfully", location: locationDoc },
      { status: 200 },
    );
  },
);
