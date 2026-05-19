import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { User } from "@/database";
import bcrypt from "bcrypt";
import { loginSchema } from "@/lib/schemas";
import { createSession } from "@/lib/session";

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { error, value } = loginSchema.validate(body);

  if (error) {
    return NextResponse.json(
      { message: "Either email or password is incorrect" },
      { status: 404 },
    );
  }

  const { email, password } = value;

  await connectToDatabase();

  const foundUser = await User.findOne({ email });

  // Returns generic error on no user found
  if (!foundUser) {
    return NextResponse.json(
      { message: "Either email or password is incorrect" },
      { status: 404 },
    );
  }

  const isPasswordValid = await bcrypt.compare(password, foundUser.password);

  // Returns generic error on invalid password
  if (!isPasswordValid) {
    return NextResponse.json(
      { message: "Either email or password is incorrect" },
      { status: 404 },
    );
  }

  // Creates user data object to be stored in session
  const userData = {
    _id: foundUser._id.toString(),
    email: foundUser.email,
    fname: foundUser.fname,
    admin: foundUser.admin,
  };

  await createSession({
    userData: userData,
  });

  return NextResponse.json(
    { message: "Login successful", user: userData },
    { status: 200 },
  );
});
