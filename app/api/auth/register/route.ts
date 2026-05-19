import { User } from "@/database";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { registerSchema } from "@/lib/schemas/auth";
import { createSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { error, value } = registerSchema.validate(body);

  if (error) {
    return NextResponse.json(
      { message: error.details[0].message },
      { status: 400 },
    );
  }

  const { fname, lname, email, password, phone } = value;

  await connectToDatabase();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json(
      { message: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await User.create({
    email,
    fname,
    lname,
    phone,
    password: hashedPassword,
  });

  const userData = {
    _id: newUser._id.toString(),
    email: newUser.email,
    fname: newUser.fname,
    admin: newUser.admin,
  };

  await createSession({ userData });

  return NextResponse.json(
    { message: "Registration successful", user: userData },
    { status: 201 },
  );
});
