import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room, Category, User } from "@/database";
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
  // Check if user is logged in
  const session = await getSession();
  if (!session || !session.userData) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  // Connect to the database
  await connectToDatabase();

  // Check if user exists
  const user = await User.findById(session.userData._id);
  if (!user) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  // Parse request body
  const body = await req.json();
  const { error, value } = roomSchema.validate(body);

  if (error) {
    return NextResponse.json(
      { message: error.details[0].message },
      { status: 400 },
    );
  }

  const { name, categoryIds } = value;

  // Validate all categories exist in the database
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
    const existingRoom = await Room.findOne({
      code,
      status: { $nin: ["closed", "ended"] },
    });

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

  // Create the new room
  const newRoom = new Room({
    name,
    code,
    adminUser: session.userData._id,
    participants: [session.userData._id], // Add the creator as the first participant
    categories: categoryIds,
    status: "open",
  });

  await newRoom.save();

  return NextResponse.json(
    { message: "Room created successfully", room: newRoom },
    { status: 201 },
  );
});
