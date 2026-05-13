import { User } from "@/database";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { registerSchema } from "@/lib/schemas/auth";
import { generateVerificationToken } from "@/lib/tokens";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  // Validates the user's registration information with the schema
  const { error, value } = registerSchema.validate(body);

  if (error) {
    return NextResponse.json(
      { message: error.details[0].message },
      { status: 400 },
    );
  }

  const { fname, lname, email, password, phone } = value;

  await connectToDatabase();

  // Check if user already exists with the corresponding email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json(
      {
        message:
          "If this email is not already registered, you will receive a verification link.",
      },
      { status: 201 },
    );
  }

  // Hashes passwords with 12 levels of salting
  const hashedPassword = await bcrypt.hash(password, 12);

  // Generates a new verification token for the user
  const { token, hashedToken, expires } = generateVerificationToken();

  // Creates the new user in the database
  await User.create({
    email,
    fname,
    lname,
    phone,
    password: hashedPassword,
    emailToken: hashedToken,
    emailTokenExpires: expires,
  });

  return NextResponse.json(
    {
      message:
        "If this email is not already registered, you will receive a verification link.",
    },
    { status: 201 },
  );
});
