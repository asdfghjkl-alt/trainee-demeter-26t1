import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room, IParticipant } from "@/database";
import { getSession } from "@/lib/session";
import { joinRoomSchema } from "@/lib/schemas";
import { setGuestParticipant } from "@/lib/guest";

export const POST = apiHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> },
  ) => {
    const { code } = await params;

    // Parse + validate the payload
    const body = await req.json();
    const { error, value } = joinRoomSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { message: error.details[0].message },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // Find the room by its code
    const room = await Room.findOne({ code });
    if (!room) {
      return NextResponse.json({ message: "Page not found" }, { status: 404 });
    }

    // Only rooms in the "waiting" status accept new participants
    if (room.status !== "waiting") {
      return NextResponse.json(
        { message: "This room is no longer accepting participants" },
        { status: 409 },
      );
    }

    const session = await getSession();
    const isGuest = !session?.userData;

    // Resolve the participant's name (guests provide it; logged-in users use session fname)
    let name: string;
    if (isGuest) {
      if (!value.name) {
        return NextResponse.json(
          { message: "Name is required for guest users" },
          { status: 400 },
        );
      }
      name = value.name;
    } else {
      name = session!.userData.fname;
    }

    // Duplicate-join check
    if (!isGuest) {
      const userId = session!.userData._id;
      const alreadyJoined = room.participants.some(
        (p: IParticipant) => p.userId?.toString() === userId,
      );
      if (alreadyJoined) {
        return NextResponse.json(
          { message: "You have already joined this room" },
          { status: 409 },
        );
      }
    } else {
      const guestNameTaken = room.participants.some(
        (p: IParticipant) =>
          p.isGuest && p.name.toLowerCase() === name.toLowerCase(),
      );
      if (guestNameTaken) {
        return NextResponse.json(
          { message: "A guest with this name has already joined" },
          { status: 409 },
        );
      }
    }

    let latitude: number | undefined;
    let longitude: number | undefined;

    const token = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (token && value.location) {
      try {
        const searchText = encodeURIComponent(value.location);
        const geoResponse = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?q=${searchText}&country=au&limit=1&access_token=${token}`
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
        console.error("Failed to geocode participant location:", err);
      }
    }

    const participant: IParticipant = {
      userId: isGuest
        ? null
        : new mongoose.Types.ObjectId(session!.userData._id),
      name,
      location: value.location,
      dietaryRequirements: value.dietaryRequirements,
      dietaryNotes: value.dietaryNotes,
      preferences: value.preferences,
      transportationMode: value.transportationMode,
      isGuest,
      isAdmin: !isGuest && room.adminUser.toString() === session!.userData._id,
      latitude,
      longitude,
    };

    room.participants.push(participant);
    console.log(room.participants);
    await room.save();

    const saved = room.participants[room.participants.length - 1];

    // Persist the guest's participantId in a cookie so the browser
    // can identify them across requests without a session
    if (isGuest) {
      await setGuestParticipant(room.code, saved._id.toString());
    }

    return NextResponse.json(
      {
        message: "Joined room successfully",
        participant: saved,
        roomCode: room.code,
      },
      { status: 201 },
    );
  },
);
