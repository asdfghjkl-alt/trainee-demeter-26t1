import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Category, User } from "@/database";
import { getSession } from "@/lib/session";
import { categorySchema } from "@/lib/schemas";

export const PUT = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Check if user is logged in
  const session = await getSession();
  if (!session || !session.userData) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  // Connect to the database
  await connectToDatabase();

  // Check if user exists and is an admin
  const user = await User.findById(session.userData._id);
  if (!user || !user.admin) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  // Parse and validate request body
  const body = await req.json();
  const { error, value } = categorySchema.validate(body);

  if (error) {
    return NextResponse.json(
      { message: error.details[0].message },
      { status: 400 },
    );
  }

  const { name } = value;
  const { id: categoryId } = await params;

  // Find and update the category
  const updatedCategory = await Category.findByIdAndUpdate(
    categoryId,
    { name },
    { new: true, runValidators: true }
  );

  if (!updatedCategory) {
    return NextResponse.json({ message: "Category not found" }, { status: 404 });
  }

  return NextResponse.json(
    { message: "Category updated successfully", category: updatedCategory },
    { status: 200 }
  );
});
