import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Category, User } from "@/database";
import { getSession } from "@/lib/session";
import { categorySchema } from "@/lib/schemas";

export const POST = apiHandler(async (req: NextRequest) => {
  // Check if user is logged in
  const session = await getSession();
  if (!session || !session.userData) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  // Connect to the database to verify the user
  await connectToDatabase();

  // Check if user exists and is an admin
  const user = await User.findById(session.userData._id);
  if (!user || !user.admin) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  // Parse request body
  const body = await req.json();
  const { error, value } = categorySchema.validate(body);

  if (error) {
    return NextResponse.json(
      { message: error.details[0].message },
      { status: 400 },
    );
  }

  const { name } = value;

  // Create the new category
  const newCategory = new Category({ name });
  await newCategory.save();

  return NextResponse.json(
    { message: "Category created successfully", category: newCategory },
    { status: 201 },
  );
});

export const GET = apiHandler(async (req: NextRequest) => {
  // Check if user is logged in
  const session = await getSession();
  if (!session || !session.userData) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  // Connect to the database
  await connectToDatabase();

  const categories = await Category.find({}).sort({ name: 1 });

  return NextResponse.json(categories, { status: 200 });
});
